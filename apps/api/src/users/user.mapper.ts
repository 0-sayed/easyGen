import type { PublicUser, UserWithPasswordHash } from "./user.types";

export function toPublicUser(user: UserWithPasswordHash): PublicUser {
  return {
    email: user.email,
    id: user.id,
    name: user.name,
  };
}
