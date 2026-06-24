import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiClientError } from "../api/client";
import { getAccountActivity, getCurrentUser, logout, signin, signup } from "./api";

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();
const expectedApiUrl =
  configuredApiUrl === undefined || configuredApiUrl.length === 0
    ? "http://127.0.0.1:3000"
    : configuredApiUrl;

describe("auth api", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("posts signup input to /auth/signup", async () => {
    const authResponse = buildAuthResponse();
    const input = buildAuthInput(authResponse.user.email);
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse(authResponse));

    await expect(signup(input)).resolves.toEqual(authResponse);

    expect(fetchMock).toHaveBeenCalledWith(`${expectedApiUrl}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  });

  it("posts signin input to /auth/signin", async () => {
    const authResponse = buildAuthResponse();
    const input = buildSigninInput(authResponse.user.email);
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse(authResponse));

    await expect(signin(input)).resolves.toEqual(authResponse);

    expect(fetchMock).toHaveBeenCalledWith(`${expectedApiUrl}/auth/signin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  });

  it("loads the current user with bearer auth", async () => {
    const authResponse = buildAuthResponse();
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse({ user: authResponse.user }));

    await expect(getCurrentUser(authResponse.accessToken)).resolves.toEqual(authResponse.user);

    expect(fetchMock).toHaveBeenCalledWith(`${expectedApiUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${authResponse.accessToken}` },
    });
  });

  it("revokes the current token on logout", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(null, {
        status: 204,
      })
    );

    await expect(logout("token-123")).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledWith(`${expectedApiUrl}/auth/logout`, {
      method: "POST",
      headers: { Authorization: "Bearer token-123" },
    });
  });

  it("loads account activity with bearer auth", async () => {
    const activityResponse = buildAccountActivityResponse();
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse(activityResponse));

    await expect(getAccountActivity("token-123")).resolves.toEqual(activityResponse);

    expect(fetchMock).toHaveBeenCalledWith(`${expectedApiUrl}/auth/activity`, {
      headers: { Authorization: "Bearer token-123" },
    });
  });

  it("rejects malformed account activity responses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      jsonResponse({
        activities: [
          {
            id: "activity-1",
            type: "auth.failed",
            description: "Should not be accepted",
            occurredAt: "2026-06-24T12:00:00.000Z",
          },
        ],
        limit: 20,
      })
    );

    await expect(getAccountActivity("token-123")).rejects.toEqual(
      new ApiClientError("Unexpected account activity response.", "unexpected")
    );
  });

  it("rejects signin unauthorized responses with typed API errors", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      jsonResponse({ message: "Invalid email or password." }, 401)
    );

    await expect(signin(buildSigninInput())).rejects.toMatchObject({
      name: "ApiClientError",
      category: "unauthorized",
      message: "Invalid email or password.",
      status: 401,
    });
  });

  it("rejects signin validation message arrays with typed API errors", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      jsonResponse({ message: ["email must be a valid email", "password is required"] }, 400)
    );

    await expect(signin(buildSigninInput())).rejects.toMatchObject({
      name: "ApiClientError",
      category: "validation",
      message: "email must be a valid email password is required",
      status: 400,
    });
  });

  it("uses the fallback error when validation error arrays are empty", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(jsonResponse({ message: [] }, 400));

    await expect(signin(buildSigninInput())).rejects.toMatchObject({
      name: "ApiClientError",
      category: "validation",
      message: "Something went wrong. Please try again.",
      status: 400,
    });
  });

  it("rejects malformed auth success responses with a typed unexpected error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      jsonResponse({ accessToken: buildToken() })
    );

    await expect(signin(buildSigninInput())).rejects.toEqual(
      new ApiClientError("Unexpected authentication response.", "unexpected")
    );
  });
});

function buildAuthResponse() {
  return {
    accessToken: buildToken(),
    user: {
      id: `user-${crypto.randomUUID()}`,
      email: buildEmail(),
      name: "Person Name",
    },
  };
}

function buildAccountActivityResponse() {
  return {
    activities: [
      {
        id: `activity-${crypto.randomUUID()}`,
        type: "auth.signed_in" as const,
        description: "Signed in",
        occurredAt: "2026-06-24T12:00:00.000Z",
      },
      {
        id: `activity-${crypto.randomUUID()}`,
        type: "account.created" as const,
        description: "Account created",
        occurredAt: "2026-06-23T09:30:00.000Z",
      },
    ],
    limit: 20,
  };
}

function buildAuthInput(email = buildEmail()) {
  return {
    email,
    name: "Person Name",
    password: buildPassword(),
  };
}

function buildSigninInput(email = buildEmail()) {
  return {
    email,
    password: buildPassword(),
  };
}

function buildEmail(): string {
  return `person-${crypto.randomUUID()}@example.test`;
}

function buildPassword(): string {
  return `A${crypto.randomUUID()}1!`;
}

function buildToken(): string {
  return crypto.randomUUID();
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
