import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";

import { AuthSessionRepository } from "./auth-session.repository";
import type { JwtPayload } from "./jwt-payload";

interface CreateAuthSessionInput {
  expiresAt: Date;
  tokenId: string;
  userId: string;
}

@Injectable()
export class AuthSessionService {
  constructor(
    @Inject(AuthSessionRepository) private readonly authSessionRepository: AuthSessionRepository
  ) {}

  async createSession(input: CreateAuthSessionInput): Promise<void> {
    await this.authSessionRepository.create(input);
  }

  async assertActive(payload: JwtPayload): Promise<void> {
    const lookup = readSessionLookup(payload);
    const isActive = await this.authSessionRepository.existsActive(lookup);

    if (!isActive) {
      throw new UnauthorizedException("Invalid authentication session.");
    }
  }

  async revokeCurrentSession(payload: JwtPayload): Promise<void> {
    await this.authSessionRepository.revoke(readSessionLookup(payload));
  }

  async revokeActiveSessionsForUser(userId: string): Promise<void> {
    await this.authSessionRepository.revokeActiveForUser(userId);
  }
}

function readSessionLookup(payload: JwtPayload): { tokenId: string; userId: string } {
  if (!isNonEmptyString(payload.jti) || !isNonEmptyString(payload.sub)) {
    throw new UnauthorizedException("Invalid authentication session.");
  }

  return {
    tokenId: payload.jti,
    userId: payload.sub,
  };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}
