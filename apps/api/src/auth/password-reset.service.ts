import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { argon2id, hash } from "argon2";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import type { UserPasswordResetState } from "../users/user.types";
import { UsersService } from "../users/users.service";
import { AuthAuditLogger } from "./auth-audit.logger";
import { AuthSessionService } from "./auth-session.service";
import { AUTH_TOKEN_DELIVERY, type AuthTokenDelivery } from "./auth-token.delivery";
import { PASSWORD_PATTERN, PASSWORD_REQUIREMENTS } from "./password-policy";

const DEFAULT_PASSWORD_RESET_TOKEN_TTL_MS = 900_000;
const DUMMY_PASSWORD_RESET_USER_ID = "000000000000000000000000";
const PASSWORD_RESET_REQUEST_MESSAGE =
  "If an account exists for that email, a password reset link has been prepared.";
const PASSWORD_RESET_CONFIRM_MESSAGE = "Password has been reset.";
const INVALID_PASSWORD_RESET_TOKEN_MESSAGE = "Password reset token is invalid or expired.";

interface PasswordResetRequestDto {
  email: string;
}

interface PasswordResetConfirmDto {
  email: string;
  newPassword: string;
  token: string;
}

interface PasswordResetResponse {
  message: string;
}

@Injectable()
export class PasswordResetService {
  constructor(
    @Inject(UsersService) private readonly usersService: UsersService,
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject(AUTH_TOKEN_DELIVERY) private readonly delivery: AuthTokenDelivery,
    @Inject(AuthAuditLogger) private readonly authAuditLogger: AuthAuditLogger,
    @Inject(AuthSessionService) private readonly authSessionService: AuthSessionService
  ) {}

  async requestReset(dto: PasswordResetRequestDto): Promise<PasswordResetResponse> {
    const user = await this.usersService.findPasswordResetStateByEmail(dto.email);

    if (user === null) {
      await this.performDummyPasswordResetTokenWrite();
      return { message: PASSWORD_RESET_REQUEST_MESSAGE };
    }

    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + this.getTokenTtlMs());
    const storedUser = await this.usersService.setPasswordResetToken(user.id, {
      expiresAt,
      tokenHash: hashToken(token),
    });

    if (storedUser === null) {
      return { message: PASSWORD_RESET_REQUEST_MESSAGE };
    }

    try {
      await this.delivery.sendPasswordResetToken({
        email: storedUser.email,
        expiresAt,
        token,
      });
    } catch (error) {
      this.authAuditLogger.logPasswordResetDeliveryFailure({
        email: storedUser.email,
        error,
        userId: storedUser.id,
      });
    }

    return { message: PASSWORD_RESET_REQUEST_MESSAGE };
  }

  async confirmReset(dto: PasswordResetConfirmDto): Promise<PasswordResetResponse> {
    if (!PASSWORD_PATTERN.test(dto.newPassword)) {
      throw new BadRequestException(PASSWORD_REQUIREMENTS);
    }

    const user = await this.usersService.findPasswordResetStateByEmail(dto.email);
    const resetAt = new Date();

    if (!isResettable(user) || user.passwordResetTokenExpiresAt.getTime() <= resetAt.getTime()) {
      throw invalidPasswordResetToken();
    }

    if (!tokenMatches(dto.token, user.passwordResetTokenHash)) {
      throw invalidPasswordResetToken();
    }

    const passwordHash = await hash(dto.newPassword, { type: argon2id });
    const resetUser = await this.usersService.resetPasswordForToken(
      user.id,
      resetAt,
      user.passwordResetTokenHash,
      passwordHash
    );

    if (resetUser === null) {
      throw invalidPasswordResetToken();
    }

    await this.authSessionService.revokeActiveSessionsForUser(resetUser.id);

    return { message: PASSWORD_RESET_CONFIRM_MESSAGE };
  }

  private getTokenTtlMs(): number {
    const configuredTtl = this.configService.get<unknown>("PASSWORD_RESET_TOKEN_TTL_MS");
    const ttlMs = typeof configuredTtl === "number" ? configuredTtl : Number(configuredTtl);

    return Number.isInteger(ttlMs) && ttlMs > 0 ? ttlMs : DEFAULT_PASSWORD_RESET_TOKEN_TTL_MS;
  }

  private async performDummyPasswordResetTokenWrite(): Promise<void> {
    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + this.getTokenTtlMs());

    await this.usersService.setPasswordResetToken(DUMMY_PASSWORD_RESET_USER_ID, {
      expiresAt,
      tokenHash: hashToken(token),
    });
  }
}

function isResettable(user: UserPasswordResetState | null): user is UserPasswordResetState & {
  passwordResetTokenExpiresAt: Date;
  passwordResetTokenHash: string;
} {
  return (
    user !== null &&
    user.passwordResetTokenHash !== null &&
    user.passwordResetTokenExpiresAt instanceof Date
  );
}

function tokenMatches(token: string, expectedHash: string): boolean {
  const candidate = Buffer.from(hashToken(token), "hex");
  const expected = Buffer.from(expectedHash, "hex");

  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function invalidPasswordResetToken(): BadRequestException {
  return new BadRequestException(INVALID_PASSWORD_RESET_TOKEN_MESSAGE);
}
