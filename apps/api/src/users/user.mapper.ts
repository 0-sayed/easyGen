import type { PublicUser, UserVerificationState, UserWithPasswordHash } from "./user.types";

export function toPublicUser(user: UserWithPasswordHash | UserVerificationState): PublicUser {
  return {
    email: user.email,
    emailVerified: user.emailVerifiedAt instanceof Date,
    id: user.id,
    name: user.name,
  };
}
