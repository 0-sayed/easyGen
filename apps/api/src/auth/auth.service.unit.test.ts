import { ConflictException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Test } from "@nestjs/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { UsersService } from "../users/users.service";
import { AuthService } from "./auth.service";

describe("AuthService", () => {
  let authService: AuthService;
  let usersService: Pick<UsersService, "create" | "findByEmail" | "findPublicById">;

  beforeEach(async () => {
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
});
