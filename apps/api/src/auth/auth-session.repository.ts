import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";

import { AuthSession } from "./schemas/auth-session.schema";

interface CreateAuthSessionInput {
  expiresAt: Date;
  tokenId: string;
  userId: string;
}

interface SessionLookupInput {
  tokenId: string;
  userId: string;
}

interface RevokeOtherSessionsInput {
  exceptTokenId: string;
  userId: string;
}

@Injectable()
export class AuthSessionRepository {
  constructor(
    @InjectModel(AuthSession.name) private readonly authSessionModel: Model<AuthSession>
  ) {}

  async create(input: CreateAuthSessionInput): Promise<void> {
    await this.authSessionModel.create({
      expiresAt: input.expiresAt,
      revokedAt: null,
      tokenId: input.tokenId,
      userId: input.userId,
    });
  }

  async existsActive(input: SessionLookupInput, now = new Date()): Promise<boolean> {
    const session = await this.authSessionModel
      .exists({
        expiresAt: { $gt: now },
        revokedAt: null,
        tokenId: input.tokenId,
        userId: input.userId,
      })
      .exec();

    return session !== null;
  }

  async revoke(input: SessionLookupInput, revokedAt = new Date()): Promise<void> {
    await this.authSessionModel
      .updateOne(
        {
          expiresAt: { $gt: revokedAt },
          revokedAt: null,
          tokenId: input.tokenId,
          userId: input.userId,
        },
        { $set: { revokedAt } }
      )
      .exec();
  }

  async revokeOthers(input: RevokeOtherSessionsInput, revokedAt = new Date()): Promise<void> {
    await this.authSessionModel
      .updateMany(
        {
          expiresAt: { $gt: revokedAt },
          revokedAt: null,
          tokenId: { $ne: input.exceptTokenId },
          userId: input.userId,
        },
        { $set: { revokedAt } }
      )
      .exec();
  }
}
