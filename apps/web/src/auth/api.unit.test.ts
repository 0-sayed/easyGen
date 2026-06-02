import { afterEach, describe, expect, it, vi } from "vitest";

import { getCurrentUser, signin, signup } from "./api";

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

    expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:3000/auth/signup", {
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

    expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:3000/auth/signin", {
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

    expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:3000/auth/me", {
      headers: { Authorization: "Bearer token-123" },
    });
  });

  it("throws a readable API error response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      jsonResponse({ message: "Invalid email or password." }, 401)
    );

    await expect(signin({ email: "person@example.com", password: "wrong" })).rejects.toThrow(
      "Invalid email or password."
    );
  });

  it("throws readable validation error arrays from API responses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      jsonResponse({ message: ["email must be a valid email", "password is required"] }, 400)
    );

    await expect(signin({ email: "person@example.com", password: "wrong" })).rejects.toThrow(
      "email must be a valid email password is required"
    );
  });
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
