import type { SigninFormValues, SignupFormValues } from "./validation";

const DEFAULT_API_URL = "http://127.0.0.1:3000";
const API_URL = getApiUrl(import.meta.env);

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
  return readAuthResponse(await postJson("/auth/signup", input));
}

export async function signin(input: SigninFormValues): Promise<AuthResponse> {
  return readAuthResponse(await postJson("/auth/signin", input));
}

export async function getCurrentUser(accessToken: string): Promise<PublicUser> {
  const response = await fetch(`${API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return readCurrentUser(await response.json());
}

async function postJson(path: string, body: unknown): Promise<unknown> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return response.json();
}

async function readErrorMessage(response: Response): Promise<string> {
  const fallback = "Something went wrong. Please try again.";

  try {
    const body: unknown = await response.json();
    if (!isObject(body)) {
      return fallback;
    }
    if (typeof body.message === "string") {
      return body.message;
    }
    if (
      Array.isArray(body.message) &&
      body.message.length > 0 &&
      body.message.every((message) => typeof message === "string")
    ) {
      return body.message.join(" ");
    }
    return fallback;
  } catch {
    return fallback;
  }
}

function getApiUrl(env: ImportMetaEnv): string {
  const apiUrl = env.VITE_API_URL?.trim();
  return apiUrl === undefined || apiUrl.length === 0 ? DEFAULT_API_URL : apiUrl;
}

function readAuthResponse(body: unknown): AuthResponse {
  if (!isObject(body) || typeof body.accessToken !== "string" || !isPublicUser(body.user)) {
    throw new Error("Unexpected authentication response.");
  }

  return { accessToken: body.accessToken, user: body.user };
}

function readCurrentUser(body: unknown): PublicUser {
  if (!isObject(body) || !isPublicUser(body.user)) {
    throw new Error("Unexpected current user response.");
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
