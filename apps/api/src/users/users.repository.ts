import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";

import { User } from "./schemas/user.schema";
import type { PublicUser, UserVerificationState, UserWithPasswordHash } from "./user.types";

interface CreateUserInput {
  email: string;
  name: string;
  passwordHash: string;
}

interface UpdateProfileInput {
  name: string;
}

export interface SetEmailVerificationTokenInput {
  expiresAt: Date;
  tokenHash: string;
}

@Injectable()
export class UsersRepository {
  constructor(@InjectModel(User.name) private readonly userModel: Model<User>) {}

  async create(input: CreateUserInput): Promise<UserWithPasswordHash> {
    const user = await this.userModel.create({
      ...input,
      email: normalizeEmail(input.email),
    });

    return {
      email: user.email,
      emailVerified: false,
      emailVerifiedAt: null,
      id: user.id,
      name: user.name,
      passwordHash: input.passwordHash,
    };
  }

  async findByEmail(email: string): Promise<UserWithPasswordHash | null> {
    const user = await this.userModel
      .findOne({ email: normalizeEmail(email) })
      .select("+passwordHash")
      .exec();

    if (user === null) {
      return null;
    }

    return {
      email: user.email,
      emailVerified: user.emailVerifiedAt instanceof Date,
      emailVerifiedAt: user.emailVerifiedAt ?? null,
      id: user.id,
      name: user.name,
      passwordHash: user.passwordHash,
    };
  }

  async findPublicById(id: string): Promise<PublicUser | null> {
    if (!isObjectIdString(id)) {
      return null;
    }

    const user = await this.userModel.findById(id).exec();

    if (user === null) {
      return null;
    }

    return {
      email: user.email,
      emailVerified: user.emailVerifiedAt instanceof Date,
      id: user.id,
      name: user.name,
    };
  }

  async findByIdWithPasswordHash(id: string): Promise<UserWithPasswordHash | null> {
    if (!isObjectIdString(id)) {
      return null;
    }

    const user = await this.userModel.findById(id).select("+passwordHash").exec();

    if (user === null) {
      return null;
    }

    return {
      email: user.email,
      emailVerified: user.emailVerifiedAt instanceof Date,
      emailVerifiedAt: user.emailVerifiedAt ?? null,
      id: user.id,
      name: user.name,
      passwordHash: user.passwordHash,
    };
  }

  async updateProfile(id: string, input: UpdateProfileInput): Promise<PublicUser | null> {
    if (!isObjectIdString(id)) {
      return null;
    }

    const user = await this.userModel
      .findByIdAndUpdate(id, { name: input.name }, { returnDocument: "after" })
      .exec();

    if (user === null) {
      return null;
    }

    return {
      email: user.email,
      emailVerified: user.emailVerifiedAt instanceof Date,
      id: user.id,
      name: user.name,
    };
  }

  async updatePasswordHash(
    id: string,
    passwordHash: string,
    expectedCurrentPasswordHash: string
  ): Promise<boolean> {
    if (!isObjectIdString(id)) {
      return false;
    }

    const result = await this.userModel
      .updateOne({ _id: id, passwordHash: expectedCurrentPasswordHash }, { $set: { passwordHash } })
      .exec();

    return result.matchedCount === 1;
  }

  async findVerificationStateByEmail(email: string): Promise<UserVerificationState | null> {
    const user = await this.userModel
      .findOne({ email: normalizeEmail(email) })
      .select("+emailVerificationTokenHash +emailVerificationTokenExpiresAt")
      .exec();

    return toVerificationState(user);
  }

  async setEmailVerificationToken(
    id: string,
    input: SetEmailVerificationTokenInput
  ): Promise<UserVerificationState | null> {
    if (!isObjectIdString(id)) {
      return null;
    }

    const user = await this.userModel
      .findOneAndUpdate(
        {
          _id: id,
          emailVerifiedAt: null,
        },
        {
          emailVerificationTokenExpiresAt: input.expiresAt,
          emailVerificationTokenHash: input.tokenHash,
        },
        { returnDocument: "after" }
      )
      .select("+emailVerificationTokenHash +emailVerificationTokenExpiresAt")
      .exec();

    return toVerificationState(user);
  }

  async markEmailVerified(id: string, verifiedAt: Date): Promise<UserVerificationState | null> {
    if (!isObjectIdString(id)) {
      return null;
    }

    const user = await this.userModel
      .findByIdAndUpdate(
        id,
        {
          emailVerificationTokenExpiresAt: null,
          emailVerificationTokenHash: null,
          emailVerifiedAt: verifiedAt,
        },
        { returnDocument: "after" }
      )
      .select("+emailVerificationTokenHash +emailVerificationTokenExpiresAt")
      .exec();

    return toVerificationState(user);
  }

  async markEmailVerifiedForToken(
    id: string,
    verifiedAt: Date,
    expectedTokenHash: string
  ): Promise<UserVerificationState | null> {
    if (!isObjectIdString(id)) {
      return null;
    }

    const user = await this.userModel
      .findOneAndUpdate(
        {
          _id: id,
          emailVerificationTokenExpiresAt: { $gt: verifiedAt },
          emailVerificationTokenHash: expectedTokenHash,
        },
        {
          emailVerificationTokenExpiresAt: null,
          emailVerificationTokenHash: null,
          emailVerifiedAt: verifiedAt,
        },
        { returnDocument: "after" }
      )
      .select("+emailVerificationTokenHash +emailVerificationTokenExpiresAt")
      .exec();

    return toVerificationState(user);
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isObjectIdString(value: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(value);
}

function toVerificationState(user: UserDocument | null): UserVerificationState | null {
  if (user === null || typeof user.email !== "string" || typeof user.name !== "string") {
    return null;
  }

  return {
    email: user.email,
    emailVerificationTokenExpiresAt:
      user.emailVerificationTokenExpiresAt instanceof Date
        ? user.emailVerificationTokenExpiresAt
        : null,
    emailVerificationTokenHash:
      typeof user.emailVerificationTokenHash === "string" ? user.emailVerificationTokenHash : null,
    emailVerifiedAt: user.emailVerifiedAt instanceof Date ? user.emailVerifiedAt : null,
    id: user.id,
    name: user.name,
  };
}

type UserDocument = User & { id: string };
