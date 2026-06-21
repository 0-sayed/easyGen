import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiClientError } from "../api/client";
import { getCurrentUser, signin, signup } from "./api";

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();
const expectedApiUrl =
  configuredApiUrl === undefined || configuredApiUrl.length === 0
    ? "http://127.0.0.1:3000"
    : configuredApiUrl;

const authResponse = {
  accessToken: "token-123",
  user: {
    id: "user-1",
    email: "person@example.com",
    name: "Person Name",
  },
};

describe("auth api", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("posts signup input to /auth/signup", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse(authResponse));

    await expect(
      signup({ email: "person@example.com", name: "Person Name", password: "Password1!" })
    ).resolves.toEqual(authResponse);

    expect(fetchMock).toHaveBeenCalledWith(`${expectedApiUrl}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "person@example.com",
        name: "Person Name",
        password: "Password1!",
      }),
    });
  });

  it("posts signin input to /auth/signin", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse(authResponse));

    await expect(signin({ email: "person@example.com", password: "Password1!" })).resolves.toEqual(
      authResponse
    );

    expect(fetchMock).toHaveBeenCalledWith(`${expectedApiUrl}/auth/signin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "person@example.com", password: "Password1!" }),
    });
  });

  it("loads the current user with bearer auth", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse({ user: authResponse.user }));

    await expect(getCurrentUser("token-123")).resolves.toEqual(authResponse.user);

    expect(fetchMock).toHaveBeenCalledWith(`${expectedApiUrl}/auth/me`, {
      headers: { Authorization: "Bearer token-123" },
    });
  });

  it("rejects signin unauthorized responses with typed API errors", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      jsonResponse({ message: "Invalid email or password." }, 401)
    );

    await expect(signin({ email: "person@example.com", password: "wrong" })).rejects.toMatchObject({
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

    await expect(signin({ email: "person@example.com", password: "wrong" })).rejects.toMatchObject({
      name: "ApiClientError",
      category: "validation",
      message: "email must be a valid email password is required",
      status: 400,
    });
  });

  it("uses the fallback error when validation error arrays are empty", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(jsonResponse({ message: [] }, 400));

    await expect(signin({ email: "person@example.com", password: "wrong" })).rejects.toMatchObject({
      name: "ApiClientError",
      category: "validation",
      message: "Something went wrong. Please try again.",
      status: 400,
    });
  });

  it("rejects malformed auth success responses with a typed unexpected error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(jsonResponse({ accessToken: "token-123" }));

    await expect(signin({ email: "person@example.com", password: "Password1!" })).rejects.toEqual(
      new ApiClientError("Unexpected authentication response.", "unexpected")
    );
  });
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
