import { Inject, Injectable } from "@nestjs/common";

import type { PublicUser, UserWithPasswordHash } from "./user.types";
import { UsersRepository } from "./users.repository";

interface CreateUserInput {
  email: string;
  name: string;
  passwordHash: string;
}

@Injectable()
export class UsersService {
  constructor(@Inject(UsersRepository) private readonly usersRepository: UsersRepository) {}

  create(input: CreateUserInput): Promise<UserWithPasswordHash> {
    return this.usersRepository.create(input);
  }

  findByEmail(email: string): Promise<UserWithPasswordHash | null> {
    return this.usersRepository.findByEmail(email);
  }

  findPublicById(id: string): Promise<PublicUser | null> {
    return this.usersRepository.findPublicById(id);
  }
}
