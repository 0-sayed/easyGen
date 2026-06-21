export interface PublicUser {
  email: string;
  emailVerified: boolean;
  id: string;
  name: string;
}

export interface UserWithPasswordHash extends PublicUser {
  emailVerifiedAt?: Date | null;
  passwordHash: string;
}

export interface UserVerificationState {
  email: string;
  emailVerificationTokenExpiresAt: Date | null;
  emailVerificationTokenHash: string | null;
  emailVerifiedAt: Date | null;
  id: string;
  name: string;
}
