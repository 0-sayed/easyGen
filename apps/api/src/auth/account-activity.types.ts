export const ACCOUNT_ACTIVITY_TYPES = [
  "account.created",
  "auth.signed_in",
  "auth.signed_out",
  "email.verified",
] as const;

export type AccountActivityType = (typeof ACCOUNT_ACTIVITY_TYPES)[number];

export interface CreateAccountActivityEventInput {
  occurredAt?: Date;
  type: AccountActivityType;
  userId: string;
}

export interface AccountActivityEventRecord {
  id: string;
  occurredAt: Date;
  type: AccountActivityType;
  userId: string;
}
