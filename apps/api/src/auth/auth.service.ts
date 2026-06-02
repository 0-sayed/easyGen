import { ConflictException, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { argon2id, hash, verify } from "argon2";

import { toPublicUser } from "../users/user.mapper";
import type { PublicUser, UserWithPasswordHash } from "../users/user.types";
import { UsersService } from "../users/users.service";
import type { SigninDto } from "./dto/signin.dto";
import type { SignupDto } from "./dto/signup.dto";
import type { JwtPayload } from "./jwt-payload";

interface AuthResponse {
  accessToken: string;
  user: PublicUser;
}

const DUMMY_PASSWORD_HASH =
  "$argon2id$v=19$m=65536,t=3,p=4$YW55c2FsdHNhbHQ$R29vZEJ5ZSBXb3JsZCBHb29kQnllIFdvcmxk";

@Injectable()
export class AuthService {
  constructor(
    @Inject(JwtService) private readonly jwtService: JwtService,
    @Inject(UsersService) private readonly usersService: UsersService
  ) {}

  async signup(dto: SignupDto): Promise<AuthResponse> {
    const existingUser = await this.usersService.findByEmail(dto.email);

    if (existingUser !== null) {
      throw new ConflictException("A user with this email already exists.");
    }

    const passwordHash = await hash(dto.password, { type: argon2id });
    const user = await this.createUser({
      email: dto.email,
      name: dto.name,
      passwordHash,
    });

    return this.buildAuthResponse(toPublicUser(user));
  }

  async signin(dto: SigninDto): Promise<AuthResponse> {
    const user = await this.usersService.findByEmail(dto.email);
    const passwordHash = user?.passwordHash ?? DUMMY_PASSWORD_HASH;
    const passwordMatches = await verify(passwordHash, dto.password);

    if (user === null || !passwordMatches) {
      throw new UnauthorizedException("Invalid email or password.");
    }

    return this.buildAuthResponse(toPublicUser(user));
  }

  async getCurrentUser(userId: string): Promise<PublicUser> {
    const user = await this.usersService.findPublicById(userId);

    if (user === null) {
      throw new UnauthorizedException("Invalid authentication token.");
    }

    return user;
  }

  private async buildAuthResponse(user: PublicUser): Promise<AuthResponse> {
    const payload: JwtPayload = { email: user.email, sub: user.id };
    const accessToken = await this.jwtService.signAsync(payload);

    return { accessToken, user };
  }

  private async createUser(input: {
    email: string;
    name: string;
    passwordHash: string;
  }): Promise<UserWithPasswordHash> {
    try {
      return await this.usersService.create(input);
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new ConflictException("A user with this email already exists.");
      }

      throw error;
    }
  }
}

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}
