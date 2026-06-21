import { ConflictException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Test } from "@nestjs/testing";
import { verify } from "argon2";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { UsersService } from "../users/users.service";
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
  let usersService: Pick<UsersService, "create" | "findByEmail" | "findPublicById">;

  beforeEach(async () => {
    vi.mocked(verify).mockReset();

    usersService = {
      create: vi.fn(),
      findByEmail: vi.fn(),
      findPublicById: vi.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: {
            signAsync: vi.fn(() => Promise.resolve("token")),
          },
        },
        {
          provide: UsersService,
          useValue: usersService,
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
