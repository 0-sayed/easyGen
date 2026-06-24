import { ConflictException, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { argon2id, hash, verify } from "argon2";
import { randomUUID } from "node:crypto";

import { toPublicUser } from "../users/user.mapper";
import type { PublicUser, UserWithPasswordHash } from "../users/user.types";
import { UsersService } from "../users/users.service";
import { AuthSessionService } from "./auth-session.service";
import type { AuthResponse } from "./dto/auth-response.dto";
import type { ChangePasswordDto } from "./dto/change-password.dto";
import type { SigninDto } from "./dto/signin.dto";
import type { SignupDto } from "./dto/signup.dto";
import type { UpdateProfileDto } from "./dto/update-profile.dto";
import type { JwtPayload } from "./jwt-payload";

const DUMMY_PASSWORD_HASH =
  "$argon2id$v=19$m=65536,t=3,p=4$YW55c2FsdHNhbHQ$R29vZEJ5ZSBXb3JsZCBHb29kQnllIFdvcmxk";
const DUPLICATE_SIGNUP_MESSAGE = "Unable to create account with the provided details.";

@Injectable()
export class AuthService {
  constructor(
    @Inject(JwtService) private readonly jwtService: JwtService,
    @Inject(AuthSessionService) private readonly authSessionService: AuthSessionService,
    @Inject(UsersService) private readonly usersService: UsersService
  ) {}

  async signup(dto: SignupDto): Promise<AuthResponse> {
    const existingUser = await this.usersService.findByEmail(dto.email);

    if (existingUser !== null) {
      throw new ConflictException(DUPLICATE_SIGNUP_MESSAGE);
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

  async updateCurrentUserProfile(userId: string, dto: UpdateProfileDto): Promise<PublicUser> {
    const user = await this.usersService.updateProfile(userId, { name: dto.name });

    if (user === null) {
      throw new UnauthorizedException("Invalid authentication token.");
    }

    return user;
  }

  async changePassword(payload: JwtPayload, dto: ChangePasswordDto): Promise<void> {
    const user = await this.usersService.findByIdWithPasswordHash(payload.sub);

    if (user === null) {
      throw new UnauthorizedException("Invalid authentication token.");
    }

    const passwordMatches = await verify(user.passwordHash, dto.currentPassword);

    if (!passwordMatches) {
      throw new UnauthorizedException("Invalid email or password.");
    }

    const passwordHash = await hash(dto.newPassword, { type: argon2id });
    await this.usersService.updatePasswordHash(user.id, passwordHash);
    await this.authSessionService.revokeOtherSessions(payload);
  }

  async logout(payload: JwtPayload): Promise<void> {
    await this.authSessionService.revokeCurrentSession(payload);
  }

  private async buildAuthResponse(user: PublicUser): Promise<AuthResponse> {
    const tokenId = randomUUID();
    const payload: JwtPayload = { email: user.email, jti: tokenId, sub: user.id };
    const accessToken = await this.jwtService.signAsync(payload);
    const expiresAt = readTokenExpiration(this.jwtService.decode(accessToken));

    await this.authSessionService.createSession({
      expiresAt,
      tokenId,
      userId: user.id,
    });

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
        throw new ConflictException(DUPLICATE_SIGNUP_MESSAGE);
      }

      throw error;
    }
  }
}

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}

function readTokenExpiration(decodedToken: unknown): Date {
  if (
    typeof decodedToken !== "object" ||
    decodedToken === null ||
    !("exp" in decodedToken) ||
    typeof decodedToken.exp !== "number" ||
    !Number.isFinite(decodedToken.exp)
  ) {
    throw new Error("Signed access token is missing an expiration timestamp.");
  }

  return new Date(decodedToken.exp * 1000);
}
