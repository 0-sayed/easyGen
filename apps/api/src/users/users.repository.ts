import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";

import { User } from "./schemas/user.schema";
import type { PublicUser, UserWithPasswordHash } from "./user.types";

interface CreateUserInput {
  email: string;
  name: string;
  passwordHash: string;
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
      id: user.id,
      name: user.name,
    };
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isObjectIdString(value: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(value);
}
