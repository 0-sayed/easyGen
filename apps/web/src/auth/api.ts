import { ApiClientError, apiRequest } from "../api/client";
import type {
  PasswordResetRequestFormValues,
  ChangePasswordRequest,
  ProfileUpdateFormValues,
  SigninFormValues,
  SignupFormValues,
} from "./validation";

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
}

export interface AuthResponse {
  accessToken: string;
  user: PublicUser;
}

export interface PasswordResetResponse {
  message: string;
}

export interface PasswordResetConfirmRequest {
  email: string;
  token: string;
  newPassword: string;
}

export interface EmailVerificationRequestInput {
  email: string;
}

export interface EmailVerificationConfirmInput {
  email: string;
  token: string;
}

export interface EmailVerificationResponse {
  message: string;
}

export interface EmailVerificationConfirmResponse {
  user: PublicUser;
}

type AccountActivityType =
  | "account.created"
  | "auth.signed_in"
  | "auth.signed_out"
  | "email.verified";

export interface AccountActivityEntry {
  id: string;
  type: AccountActivityType;
  description: string;
  occurredAt: string;
}

export interface AccountActivityResponse {
  activities: AccountActivityEntry[];
  limit: number;
}

export async function signup(input: SignupFormValues): Promise<AuthResponse> {
  return readAuthResponse(
    await apiRequest("/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
  );
}

export async function signin(input: SigninFormValues): Promise<AuthResponse> {
  return readAuthResponse(
    await apiRequest("/auth/signin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
  );
}

export async function requestPasswordReset(
  input: PasswordResetRequestFormValues
): Promise<PasswordResetResponse> {
  return readPasswordResetResponse(
    await apiRequest("/auth/password-reset/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
  );
}

export async function requestEmailVerification(
  input: EmailVerificationRequestInput
): Promise<EmailVerificationResponse> {
  return readEmailVerificationResponse(
    await apiRequest("/auth/email-verification/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
  );
}

export async function confirmPasswordReset(
  input: PasswordResetConfirmRequest
): Promise<PasswordResetResponse> {
  return readPasswordResetResponse(
    await apiRequest("/auth/password-reset/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
  );
}

export async function confirmEmailVerification(
  input: EmailVerificationConfirmInput
): Promise<EmailVerificationConfirmResponse> {
  return readEmailVerificationConfirmResponse(
    await apiRequest("/auth/email-verification/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
  );
}

export async function getCurrentUser(accessToken: string): Promise<PublicUser> {
  return readCurrentUser(
    await apiRequest("/auth/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
  );
}

export async function updateProfile(
  accessToken: string,
  input: ProfileUpdateFormValues
): Promise<PublicUser> {
  return readCurrentUser(
    await apiRequest("/auth/me", {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    })
  );
}

export async function changePassword(
  accessToken: string,
  input: ChangePasswordRequest
): Promise<void> {
  await apiRequest("/auth/password", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
}

export async function logout(accessToken: string): Promise<void> {
  await apiRequest("/auth/logout", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function getAccountActivity(accessToken: string): Promise<AccountActivityResponse> {
  return readAccountActivityResponse(
    await apiRequest("/auth/activity", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
  );
}

function readAuthResponse(body: unknown): AuthResponse {
  if (!isObject(body) || typeof body.accessToken !== "string" || !isPublicUser(body.user)) {
    throw new ApiClientError("Unexpected authentication response.", "unexpected");
  }

  return { accessToken: body.accessToken, user: body.user };
}

function readPasswordResetResponse(body: unknown): PasswordResetResponse {
  if (!isObject(body) || typeof body.message !== "string") {
    throw new ApiClientError("Unexpected password reset response.", "unexpected");
  }

  return { message: body.message };
}

function readCurrentUser(body: unknown): PublicUser {
  if (!isObject(body) || !isPublicUser(body.user)) {
    throw new ApiClientError("Unexpected current user response.", "unexpected");
  }

  return body.user;
}

function readEmailVerificationResponse(body: unknown): EmailVerificationResponse {
  if (!isObject(body) || typeof body.message !== "string") {
    throw new ApiClientError("Unexpected email verification response.", "unexpected");
  }

  return { message: body.message };
}

function readEmailVerificationConfirmResponse(body: unknown): EmailVerificationConfirmResponse {
  if (!isObject(body) || !isPublicUser(body.user)) {
    throw new ApiClientError("Unexpected email verification response.", "unexpected");
  }

  return { user: body.user };
}

function readAccountActivityResponse(body: unknown): AccountActivityResponse {
  if (
    !isObject(body) ||
    !Array.isArray(body.activities) ||
    !body.activities.every(isAccountActivityEntry) ||
    typeof body.limit !== "number"
  ) {
    throw new ApiClientError("Unexpected account activity response.", "unexpected");
  }

  return {
    activities: body.activities,
    limit: body.limit,
  };
}

function isAccountActivityEntry(value: unknown): value is AccountActivityEntry {
  return (
    isObject(value) &&
    typeof value.id === "string" &&
    isAccountActivityType(value.type) &&
    typeof value.description === "string" &&
    typeof value.occurredAt === "string"
  );
}

function isAccountActivityType(value: unknown): value is AccountActivityType {
  return (
    value === "account.created" ||
    value === "auth.signed_in" ||
    value === "auth.signed_out" ||
    value === "email.verified"
  );
}

function isPublicUser(value: unknown): value is PublicUser {
  return (
    isObject(value) &&
    typeof value.id === "string" &&
    typeof value.email === "string" &&
    typeof value.name === "string" &&
    typeof value.emailVerified === "boolean"
  );
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
