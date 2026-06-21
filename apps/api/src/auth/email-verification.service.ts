import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { toPublicUser } from "../users/user.mapper";
import type { UserVerificationState } from "../users/user.types";
import { UsersService } from "../users/users.service";
import type { EmailVerificationConfirmResponse } from "./dto/email-verification-confirm-response.dto";
import type { EmailVerificationConfirmDto } from "./dto/email-verification-confirm.dto";
import type { EmailVerificationRequestDto } from "./dto/email-verification-request.dto";
import type { EmailVerificationResponse } from "./dto/email-verification-response.dto";
import {
  EMAIL_VERIFICATION_DELIVERY,
  type EmailVerificationDelivery,
} from "./email-verification.delivery";

const DEFAULT_EMAIL_VERIFICATION_TOKEN_TTL_MS = 900_000;
const EMAIL_VERIFICATION_REQUEST_MESSAGE =
  "If an account exists for that email, a verification link has been prepared.";
const INVALID_EMAIL_VERIFICATION_TOKEN_MESSAGE = "Verification token is invalid or expired.";

@Injectable()
export class EmailVerificationService {
  constructor(
    @Inject(UsersService) private readonly usersService: UsersService,
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject(EMAIL_VERIFICATION_DELIVERY)
    private readonly delivery: EmailVerificationDelivery
  ) {}

  async requestVerification(dto: EmailVerificationRequestDto): Promise<EmailVerificationResponse> {
    const user = await this.usersService.findVerificationStateByEmail(dto.email);

    if (user === null || user.emailVerifiedAt instanceof Date) {
      return { message: EMAIL_VERIFICATION_REQUEST_MESSAGE };
    }

    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + this.getTokenTtlMs());

    const storedUser = await this.usersService.setEmailVerificationToken(user.id, {
      expiresAt,
      tokenHash: hashToken(token),
    });

    if (storedUser === null) {
      return { message: EMAIL_VERIFICATION_REQUEST_MESSAGE };
    }

    try {
      await this.delivery.sendVerificationToken({
        email: storedUser.email,
        expiresAt,
        token,
      });
    } catch {
      return { message: EMAIL_VERIFICATION_REQUEST_MESSAGE };
    }

    return { message: EMAIL_VERIFICATION_REQUEST_MESSAGE };
  }

  async confirmVerification(
    dto: EmailVerificationConfirmDto
  ): Promise<EmailVerificationConfirmResponse> {
    const user = await this.usersService.findVerificationStateByEmail(dto.email);

    const verifiedAt = new Date();

    if (
      !isVerifiable(user) ||
      user.emailVerificationTokenExpiresAt.getTime() <= verifiedAt.getTime()
    ) {
      throw invalidVerificationToken();
    }

    if (!tokenMatches(dto.token, user.emailVerificationTokenHash)) {
      throw invalidVerificationToken();
    }

    const verifiedUser = await this.usersService.markEmailVerifiedForToken(
      user.id,
      verifiedAt,
      user.emailVerificationTokenHash
    );

    if (verifiedUser === null) {
      throw invalidVerificationToken();
    }

    return { user: toPublicUser(verifiedUser) };
  }

  private getTokenTtlMs(): number {
    const configuredTtl = this.configService.get<unknown>("EMAIL_VERIFICATION_TOKEN_TTL_MS");
    const ttlMs = typeof configuredTtl === "number" ? configuredTtl : Number(configuredTtl);

    return Number.isInteger(ttlMs) && ttlMs > 0 ? ttlMs : DEFAULT_EMAIL_VERIFICATION_TOKEN_TTL_MS;
  }
}

function isVerifiable(user: UserVerificationState | null): user is UserVerificationState & {
  emailVerificationTokenExpiresAt: Date;
  emailVerificationTokenHash: string;
} {
  return (
    user !== null &&
    user.emailVerificationTokenHash !== null &&
    user.emailVerificationTokenExpiresAt instanceof Date
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

function invalidVerificationToken(): BadRequestException {
  return new BadRequestException(INVALID_EMAIL_VERIFICATION_TOKEN_MESSAGE);
}
