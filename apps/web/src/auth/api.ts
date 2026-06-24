import { ApiClientError, apiRequest } from "../api/client";
import type { SigninFormValues, SignupFormValues } from "./validation";

export interface PublicUser {
  id: string;
  email: string;
  name: string;
}

export interface AuthResponse {
  accessToken: string;
  user: PublicUser;
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

export async function getCurrentUser(accessToken: string): Promise<PublicUser> {
  return readCurrentUser(
    await apiRequest("/auth/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
  );
}

export async function logout(accessToken: string): Promise<void> {
  await apiRequest("/auth/logout", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

function readAuthResponse(body: unknown): AuthResponse {
  if (!isObject(body) || typeof body.accessToken !== "string" || !isPublicUser(body.user)) {
    throw new ApiClientError("Unexpected authentication response.", "unexpected");
  }

  return { accessToken: body.accessToken, user: body.user };
}

function readCurrentUser(body: unknown): PublicUser {
  if (!isObject(body) || !isPublicUser(body.user)) {
    throw new ApiClientError("Unexpected current user response.", "unexpected");
  }

  return body.user;
}

function isPublicUser(value: unknown): value is PublicUser {
  return (
    isObject(value) &&
    typeof value.id === "string" &&
    typeof value.email === "string" &&
    typeof value.name === "string"
  );
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
