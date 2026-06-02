export interface PublicUser {
  email: string;
  id: string;
  name: string;
}

export interface UserWithPasswordHash extends PublicUser {
  passwordHash: string;
}
