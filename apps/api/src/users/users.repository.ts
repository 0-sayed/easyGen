import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";

import { User } from "./schemas/user.schema";
import type {
  PublicUser,
  SoftDeleteUserInput,
  UserPasswordResetState,
  UserVerificationState,
  UserWithPasswordHash,
} from "./user.types";

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

export interface SetPasswordResetTokenInput {
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
      .findOne({ email: normalizeEmail(email), deletedAt: null })
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

    const user = await this.userModel.findOne({ _id: id, deletedAt: null }).exec();

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

    const user = await this.userModel
      .findOne({ _id: id, deletedAt: null })
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

  async updateProfile(id: string, input: UpdateProfileInput): Promise<PublicUser | null> {
    if (!isObjectIdString(id)) {
      return null;
    }

    const user = await this.userModel
      .findOneAndUpdate(
        { _id: id, deletedAt: null },
        { name: input.name },
        { returnDocument: "after" }
      )
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
      .updateOne(
        { _id: id, deletedAt: null, passwordHash: expectedCurrentPasswordHash },
        { $set: { passwordHash } }
      )
      .exec();

    return result.matchedCount === 1;
  }

  async softDelete(id: string, input: SoftDeleteUserInput): Promise<boolean> {
    if (!isObjectIdString(id)) {
      return false;
    }

    const result = await this.userModel
      .updateOne(
        {
          _id: id,
          deletedAt: null,
          passwordHash: input.previousPasswordHash,
        },
        {
          $set: {
            deletedAt: input.deletedAt,
            email: buildDeletedEmail(id),
            emailVerificationTokenExpiresAt: null,
            emailVerificationTokenHash: null,
            name: "Deleted Account",
            passwordHash: input.passwordHash,
            passwordResetTokenExpiresAt: null,
            passwordResetTokenHash: null,
          },
        }
      )
      .exec();

    return result.modifiedCount === 1;
  }

  async findVerificationStateByEmail(email: string): Promise<UserVerificationState | null> {
    const user = await this.userModel
      .findOne({ email: normalizeEmail(email), deletedAt: null })
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
          deletedAt: null,
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
      .findOneAndUpdate(
        {
          _id: id,
          deletedAt: null,
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
          deletedAt: null,
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

  async findPasswordResetStateByEmail(email: string): Promise<UserPasswordResetState | null> {
    const user = await this.userModel
      .findOne({ email: normalizeEmail(email), deletedAt: null })
      .select("+passwordResetTokenHash +passwordResetTokenExpiresAt")
      .exec();

    return toPasswordResetState(user);
  }

  async setPasswordResetToken(
    id: string,
    input: SetPasswordResetTokenInput
  ): Promise<UserPasswordResetState | null> {
    if (!isObjectIdString(id)) {
      return null;
    }

    const user = await this.userModel
      .findOneAndUpdate(
        {
          _id: id,
          deletedAt: null,
        },
        {
          passwordResetTokenExpiresAt: input.expiresAt,
          passwordResetTokenHash: input.tokenHash,
        },
        { returnDocument: "after" }
      )
      .select("+passwordResetTokenHash +passwordResetTokenExpiresAt")
      .exec();

    return toPasswordResetState(user);
  }

  async resetPasswordForToken(
    id: string,
    resetAt: Date,
    expectedTokenHash: string,
    passwordHash: string
  ): Promise<UserPasswordResetState | null> {
    if (!isObjectIdString(id)) {
      return null;
    }

    const user = await this.userModel
      .findOneAndUpdate(
        {
          _id: id,
          deletedAt: null,
          passwordResetTokenExpiresAt: { $gt: resetAt },
          passwordResetTokenHash: expectedTokenHash,
        },
        {
          passwordHash,
          passwordResetTokenExpiresAt: null,
          passwordResetTokenHash: null,
        },
        { returnDocument: "after" }
      )
      .select("+passwordResetTokenHash +passwordResetTokenExpiresAt")
      .exec();

    return toPasswordResetState(user);
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function buildDeletedEmail(id: string): string {
  return `deleted+${id.toLowerCase()}@deleted.local`;
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

function toPasswordResetState(user: UserDocument | null): UserPasswordResetState | null {
  if (user === null || typeof user.email !== "string" || typeof user.name !== "string") {
    return null;
  }

  return {
    email: user.email,
    id: user.id,
    name: user.name,
    passwordResetTokenExpiresAt:
      user.passwordResetTokenExpiresAt instanceof Date ? user.passwordResetTokenExpiresAt : null,
    passwordResetTokenHash:
      typeof user.passwordResetTokenHash === "string" ? user.passwordResetTokenHash : null,
  };
}

type UserDocument = User & { id: string };
