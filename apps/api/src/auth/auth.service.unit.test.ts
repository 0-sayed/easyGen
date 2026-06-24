import { ConflictException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Test } from "@nestjs/testing";
import { verify } from "argon2";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { UsersService } from "../users/users.service";
import { AuthSessionService } from "./auth-session.service";
import { AuthService } from "./auth.service";

const DUPLICATE_SIGNUP_MESSAGE = "Unable to create account with the provided details.";

vi.mock("argon2", async (importOriginal) => {
  const actual = await importOriginal<typeof import("argon2")>();

  return {
    ...actual,
    verify: vi.fn(),
  };
});

describe("AuthService", () => {
  let authService: AuthService;
  let authSessionService: Pick<AuthSessionService, "createSession" | "revokeCurrentSession">;
  let jwtService: {
    decode: ReturnType<typeof vi.fn>;
    signAsync: ReturnType<typeof vi.fn>;
  };
  let usersService: Pick<UsersService, "create" | "findByEmail" | "findPublicById">;

  beforeEach(async () => {
    vi.mocked(verify).mockReset();

    usersService = {
      create: vi.fn(),
      findByEmail: vi.fn(),
      findPublicById: vi.fn(),
    };
    authSessionService = {
      createSession: vi.fn(),
      revokeCurrentSession: vi.fn(),
    };
    jwtService = {
      decode: vi.fn(() => ({ exp: 1_700_000_000 })),
      signAsync: vi.fn(() => Promise.resolve("token")),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: jwtService,
        },
        {
          provide: UsersService,
          useValue: usersService,
        },
        {
          provide: AuthSessionService,
          useValue: authSessionService,
        },
      ],
    }).compile();

    authService = moduleRef.get(AuthService);
  });

  it("maps duplicate email races during signup to sanitized conflict responses", async () => {
    vi.mocked(usersService.findByEmail).mockResolvedValue(null);
    vi.mocked(usersService.create).mockRejectedValue({ code: 11000 });

    const result = authService.signup({
      email: "person@example.com",
      name: "Person Name",
      password: "Password1!",
    });

    await expectSanitizedSignupConflict(result);
  });

  it("maps duplicate email prechecks during signup to sanitized conflict responses", async () => {
    vi.mocked(usersService.findByEmail).mockResolvedValue({
      email: "person@example.com",
      emailVerified: false,
      emailVerifiedAt: null,
      id: "user-id",
      name: "Person Name",
      passwordHash: "hash",
    });

    const result = authService.signup({
      email: "person@example.com",
      name: "Person Name",
      password: "Password1!",
    });

    await expectSanitizedSignupConflict(result);
    expect(usersService.create).not.toHaveBeenCalled();
  });

  it("runs a dummy password verification when signin email is unknown", async () => {
    vi.mocked(usersService.findByEmail).mockResolvedValue(null);
    vi.mocked(verify).mockResolvedValue(false);

    await expect(
      authService.signin({
        email: "missing@example.com",
        password: "Password1!",
      })
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(verify).toHaveBeenCalledTimes(1);
    expect(verify).toHaveBeenCalledWith(expect.stringMatching(/^\$argon2id\$/), "Password1!");
  });

  it("issues signin tokens with a session-backed token id and expiration", async () => {
    vi.mocked(usersService.findByEmail).mockResolvedValue({
      email: "person@example.com",
      emailVerified: false,
      emailVerifiedAt: null,
      id: "user-id",
      name: "Person Name",
      passwordHash: "hash",
    });
    vi.mocked(verify).mockResolvedValue(true);

    await expect(
      authService.signin({
        email: "person@example.com",
        password: "Password1!",
      })
    ).resolves.toEqual({
      accessToken: "token",
      user: {
        email: "person@example.com",
        emailVerified: false,
        id: "user-id",
        name: "Person Name",
      },
    });

    expect(jwtService.signAsync).toHaveBeenCalledWith({
      email: "person@example.com",
      jti: expect.any(String),
      sub: "user-id",
    });
    const signedPayload = vi.mocked(jwtService.signAsync).mock.calls[0]?.[0] as
      | { jti: string }
      | undefined;
    expect(authSessionService.createSession).toHaveBeenCalledWith({
      expiresAt: new Date(1_700_000_000 * 1000),
      tokenId: signedPayload?.jti,
      userId: "user-id",
    });
  });

  it("rejects signin token issuance without a finite expiration and does not persist a session", async () => {
    vi.mocked(usersService.findByEmail).mockResolvedValue({
      email: "person@example.com",
      emailVerified: false,
      emailVerifiedAt: null,
      id: "user-id",
      name: "Person Name",
      passwordHash: "hash",
    });
    vi.mocked(verify).mockResolvedValue(true);
    vi.mocked(jwtService.decode).mockReturnValue({ exp: Number.POSITIVE_INFINITY });

    await expect(
      authService.signin({
        email: "person@example.com",
        password: "Password1!",
      })
    ).rejects.toThrow(new Error("Signed access token is missing an expiration timestamp."));

    expect(authSessionService.createSession).not.toHaveBeenCalled();
  });

  it("revokes the current session during logout", async () => {
    const payload = {
      email: "person@example.com",
      jti: "token-id",
      sub: "user-id",
    };

    await authService.logout(payload);

    expect(authSessionService.revokeCurrentSession).toHaveBeenCalledWith(payload);
  });
});

async function expectSanitizedSignupConflict(result: Promise<unknown>): Promise<void> {
  await expect(result).rejects.toBeInstanceOf(ConflictException);
  await expect(result).rejects.toMatchObject({
    message: DUPLICATE_SIGNUP_MESSAGE,
  });

  await result.catch((error: unknown) => {
    expect(error).toBeInstanceOf(ConflictException);
    expect((error as ConflictException).getStatus()).toBe(409);
  });
}
