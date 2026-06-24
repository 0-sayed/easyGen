import { Inject, Injectable } from "@nestjs/common";

import type { PublicUser, UserVerificationState, UserWithPasswordHash } from "./user.types";
import { type SetEmailVerificationTokenInput, UsersRepository } from "./users.repository";

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

  findVerificationStateByEmail(email: string): Promise<UserVerificationState | null> {
    return this.usersRepository.findVerificationStateByEmail(email);
  }

  setEmailVerificationToken(
    id: string,
    input: SetEmailVerificationTokenInput
  ): Promise<UserVerificationState | null> {
    return this.usersRepository.setEmailVerificationToken(id, input);
  }

  markEmailVerified(id: string, verifiedAt: Date): Promise<UserVerificationState | null> {
    return this.usersRepository.markEmailVerified(id, verifiedAt);
  }

  markEmailVerifiedForToken(
    id: string,
    verifiedAt: Date,
    expectedTokenHash: string
  ): Promise<UserVerificationState | null> {
    return this.usersRepository.markEmailVerifiedForToken(id, verifiedAt, expectedTokenHash);
  }
}
