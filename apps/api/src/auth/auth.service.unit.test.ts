import { BadRequestException, ConflictException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Test } from "@nestjs/testing";
import { hash, verify } from "argon2";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { UsersService } from "../users/users.service";
import { AuthSessionService } from "./auth-session.service";
import { AuthService } from "./auth.service";

const DUPLICATE_SIGNUP_MESSAGE = "Unable to create account with the provided details.";

vi.mock("argon2", async (importOriginal) => {
  const actual = await importOriginal<typeof import("argon2")>();

  return {
    ...actual,
    hash: vi.fn(),
    verify: vi.fn(),
  };
});

describe("AuthService", () => {
  let authService: AuthService;
  let authSessionService: Pick<
    AuthSessionService,
    "createSession" | "revokeActiveSessionsForUser" | "revokeCurrentSession" | "revokeOtherSessions"
  >;
  let jwtService: {
    decode: ReturnType<typeof vi.fn>;
    signAsync: ReturnType<typeof vi.fn>;
  };
  let usersService: Pick<
    UsersService,
    | "create"
    | "findByEmail"
    | "findByIdWithPasswordHash"
    | "findPublicById"
    | "softDelete"
    | "updatePasswordHash"
    | "updateProfile"
  >;

  beforeEach(async () => {
    vi.mocked(hash).mockReset();
    vi.mocked(hash).mockResolvedValue("hashed-new-password");
    vi.mocked(verify).mockReset();

    usersService = {
      create: vi.fn(),
      findByEmail: vi.fn(),
      findByIdWithPasswordHash: vi.fn(),
      findPublicById: vi.fn(),
      softDelete: vi.fn(),
      updatePasswordHash: vi.fn(),
      updateProfile: vi.fn(),
    };
    authSessionService = {
      createSession: vi.fn(),
      revokeActiveSessionsForUser: vi.fn(),
      revokeCurrentSession: vi.fn(),
      revokeOtherSessions: vi.fn(),
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

  it("rejects signup emails in the deleted-account tombstone namespace", async () => {
    vi.mocked(usersService.findByEmail).mockResolvedValue(null);

    const result = authService.signup({
      email: "Deleted+507f1f77bcf86cd799439011@deleted.local",
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

  it("updates the current user's supported profile fields", async () => {
    vi.mocked(usersService.updateProfile).mockResolvedValue({
      email: "person@example.com",
      emailVerified: false,
      id: "user-id",
      name: "Updated Person",
    });

    await expect(
      authService.updateCurrentUserProfile("user-id", { name: "Updated Person" })
    ).resolves.toEqual({
      email: "person@example.com",
      emailVerified: false,
      id: "user-id",
      name: "Updated Person",
    });

    expect(usersService.updateProfile).toHaveBeenCalledWith("user-id", {
      name: "Updated Person",
    });
  });

  it("rejects profile updates for unknown token subjects", async () => {
    vi.mocked(usersService.updateProfile).mockResolvedValue(null);

    const result = authService.updateCurrentUserProfile("missing-user", {
      name: "Updated Person",
    });

    await expect(result).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(result).rejects.toMatchObject({
      message: "Invalid authentication token.",
    });
  });

  it("changes password after verifying the current password and revokes other sessions", async () => {
    vi.mocked(usersService.findByIdWithPasswordHash).mockResolvedValue({
      email: "person@example.com",
      emailVerified: false,
      emailVerifiedAt: null,
      id: "user-id",
      name: "Person Name",
      passwordHash: "old-hash",
    });
    vi.mocked(verify).mockResolvedValue(true);
    vi.mocked(usersService.updatePasswordHash).mockResolvedValue(true);

    await authService.changePassword(
      { email: "person@example.com", jti: "current-token-id", sub: "user-id" },
      { currentPassword: "Password1!", newPassword: "NewPassword1!" }
    );

    expect(verify).toHaveBeenCalledWith("old-hash", "Password1!");
    expect(hash).toHaveBeenCalledWith("NewPassword1!", { type: expect.any(Number) });
    expect(usersService.updatePasswordHash).toHaveBeenCalledWith(
      "user-id",
      "hashed-new-password",
      "old-hash"
    );
    expect(authSessionService.revokeOtherSessions).toHaveBeenCalledWith({
      email: "person@example.com",
      jti: "current-token-id",
      sub: "user-id",
    });
  });

  it("rejects password changes for unknown token subjects without checking credentials", async () => {
    vi.mocked(usersService.findByIdWithPasswordHash).mockResolvedValue(null);

    const result = authService.changePassword(
      { email: "person@example.com", jti: "current-token-id", sub: "missing-user" },
      { currentPassword: "Password1!", newPassword: "NewPassword1!" }
    );

    await expect(result).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(result).rejects.toMatchObject({
      message: "Invalid authentication token.",
    });

    expect(verify).not.toHaveBeenCalled();
    expect(hash).not.toHaveBeenCalled();
    expect(usersService.updatePasswordHash).not.toHaveBeenCalled();
    expect(authSessionService.revokeOtherSessions).not.toHaveBeenCalled();
  });

  it("rejects password changes with the wrong current password", async () => {
    vi.mocked(usersService.findByIdWithPasswordHash).mockResolvedValue({
      email: "person@example.com",
      emailVerified: false,
      emailVerifiedAt: null,
      id: "user-id",
      name: "Person Name",
      passwordHash: "old-hash",
    });
    vi.mocked(verify).mockResolvedValue(false);

    const result = authService.changePassword(
      { email: "person@example.com", jti: "current-token-id", sub: "user-id" },
      { currentPassword: "WrongPassword1!", newPassword: "NewPassword1!" }
    );

    await expect(result).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(result).rejects.toMatchObject({
      message: "Invalid current password.",
    });

    expect(usersService.updatePasswordHash).not.toHaveBeenCalled();
    expect(authSessionService.revokeOtherSessions).not.toHaveBeenCalled();
  });

  it("rejects password changes that reuse the current password", async () => {
    vi.mocked(usersService.findByIdWithPasswordHash).mockResolvedValue({
      email: "person@example.com",
      emailVerified: false,
      emailVerifiedAt: null,
      id: "user-id",
      name: "Person Name",
      passwordHash: "old-hash",
    });
    vi.mocked(verify).mockResolvedValue(true);

    const result = authService.changePassword(
      { email: "person@example.com", jti: "current-token-id", sub: "user-id" },
      { currentPassword: "Password1!", newPassword: "Password1!" }
    );

    await expect(result).rejects.toBeInstanceOf(BadRequestException);
    await expect(result).rejects.toMatchObject({
      message: "New password must be different from current password.",
    });

    expect(hash).not.toHaveBeenCalled();
    expect(usersService.updatePasswordHash).not.toHaveBeenCalled();
    expect(authSessionService.revokeOtherSessions).not.toHaveBeenCalled();
  });

  it("rejects stale password changes without revoking sessions", async () => {
    vi.mocked(usersService.findByIdWithPasswordHash).mockResolvedValue({
      email: "person@example.com",
      emailVerified: false,
      emailVerifiedAt: null,
      id: "user-id",
      name: "Person Name",
      passwordHash: "old-hash",
    });
    vi.mocked(verify).mockResolvedValue(true);
    vi.mocked(usersService.updatePasswordHash).mockResolvedValue(false);

    const result = authService.changePassword(
      { email: "person@example.com", jti: "current-token-id", sub: "user-id" },
      { currentPassword: "Password1!", newPassword: "NewPassword1!" }
    );

    await expect(result).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(result).rejects.toMatchObject({
      message: "Invalid current password.",
    });

    expect(usersService.updatePasswordHash).toHaveBeenCalledWith(
      "user-id",
      "hashed-new-password",
      "old-hash"
    );
    expect(authSessionService.revokeOtherSessions).not.toHaveBeenCalled();
  });

  it("deletes the current account after verifying the current password and revokes all sessions", async () => {
    vi.mocked(usersService.findByIdWithPasswordHash).mockResolvedValue({
      email: "person@example.com",
      emailVerified: false,
      emailVerifiedAt: null,
      id: "user-id",
      name: "Person Name",
      passwordHash: "old-hash",
    });
    vi.mocked(verify).mockResolvedValue(true);
    vi.mocked(usersService.softDelete).mockResolvedValue(true);

    await authService.deleteCurrentAccount(
      { email: "person@example.com", jti: "current-token-id", sub: "user-id" },
      { currentPassword: "Password1!" }
    );

    expect(verify).toHaveBeenCalledWith("old-hash", "Password1!");
    expect(hash).toHaveBeenCalledWith(expect.any(String), { type: expect.any(Number) });
    expect(usersService.softDelete).toHaveBeenCalledWith("user-id", {
      deletedAt: expect.any(Date),
      passwordHash: "hashed-new-password",
      previousPasswordHash: "old-hash",
    });
    expect(authSessionService.revokeActiveSessionsForUser).toHaveBeenCalledWith("user-id");
  });

  it("rejects account deletion for unknown token subjects without checking credentials", async () => {
    vi.mocked(usersService.findByIdWithPasswordHash).mockResolvedValue(null);

    const result = authService.deleteCurrentAccount(
      { email: "person@example.com", jti: "current-token-id", sub: "missing-user" },
      { currentPassword: "Password1!" }
    );

    await expect(result).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(result).rejects.toMatchObject({
      message: "Invalid authentication token.",
    });
    expect(verify).not.toHaveBeenCalled();
    expect(usersService.softDelete).not.toHaveBeenCalled();
    expect(authSessionService.revokeActiveSessionsForUser).not.toHaveBeenCalled();
  });

  it("rejects account deletion with the wrong current password", async () => {
    vi.mocked(usersService.findByIdWithPasswordHash).mockResolvedValue({
      email: "person@example.com",
      emailVerified: false,
      emailVerifiedAt: null,
      id: "user-id",
      name: "Person Name",
      passwordHash: "old-hash",
    });
    vi.mocked(verify).mockResolvedValue(false);

    const result = authService.deleteCurrentAccount(
      { email: "person@example.com", jti: "current-token-id", sub: "user-id" },
      { currentPassword: "WrongPassword1!" }
    );

    await expect(result).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(result).rejects.toMatchObject({
      message: "Invalid current password.",
    });
    expect(usersService.softDelete).not.toHaveBeenCalled();
    expect(authSessionService.revokeActiveSessionsForUser).not.toHaveBeenCalled();
  });

  it("rejects stale account deletion races without revoking sessions", async () => {
    vi.mocked(usersService.findByIdWithPasswordHash).mockResolvedValue({
      email: "person@example.com",
      emailVerified: false,
      emailVerifiedAt: null,
      id: "user-id",
      name: "Person Name",
      passwordHash: "old-hash",
    });
    vi.mocked(verify).mockResolvedValue(true);
    vi.mocked(usersService.softDelete).mockResolvedValue(false);

    const result = authService.deleteCurrentAccount(
      { email: "person@example.com", jti: "current-token-id", sub: "user-id" },
      { currentPassword: "Password1!" }
    );

    await expect(result).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(result).rejects.toMatchObject({
      message: "Invalid current password.",
    });
    expect(usersService.softDelete).toHaveBeenCalledWith("user-id", {
      deletedAt: expect.any(Date),
      passwordHash: "hashed-new-password",
      previousPasswordHash: "old-hash",
    });
    expect(authSessionService.revokeActiveSessionsForUser).not.toHaveBeenCalled();
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
