import { ConflictException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Test } from "@nestjs/testing";
import { verify } from "argon2";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { UsersService } from "../users/users.service";
import { AuthService } from "./auth.service";

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

  it("maps duplicate email races during signup to conflict responses", async () => {
    vi.mocked(usersService.findByEmail).mockResolvedValue(null);
    vi.mocked(usersService.create).mockRejectedValue({ code: 11000 });

    await expect(
      authService.signup({
        email: "person@example.com",
        name: "Person Name",
        password: "Password1!",
      })
    ).rejects.toBeInstanceOf(ConflictException);
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
