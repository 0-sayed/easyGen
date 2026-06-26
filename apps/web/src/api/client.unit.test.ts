import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiClientError, apiRequest, getApiUrl, isApiClientError } from "./client";

const fallbackMessage = "Something went wrong. Please try again.";
const networkMessage = "Unable to reach the API. Please try again.";

describe("api client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("resolves a blank API URL to the local API default", () => {
    vi.stubEnv("VITE_API_URL", "");

    expect(getApiUrl(import.meta.env)).toBe("http://127.0.0.1:3000");
  });

  it("trims a configured API URL", () => {
    vi.stubEnv("VITE_API_URL", "  http://127.0.0.1:3010  ");

    expect(getApiUrl(import.meta.env)).toBe("http://127.0.0.1:3010");
  });

  it("keeps the configured default API URL", () => {
    vi.stubEnv("VITE_API_URL", "http://127.0.0.1:3000");

    expect(getApiUrl(import.meta.env)).toBe("http://127.0.0.1:3000");
  });

  it("returns parsed JSON for successful responses", async () => {
    vi.stubEnv("VITE_API_URL", "");
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse({ ok: true }));

    await expect(apiRequest("/status")).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:3000/status", {});
  });

  it("normalizes request paths without a leading slash", async () => {
    vi.stubEnv("VITE_API_URL", "");
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse({ ok: true }));

    await expect(apiRequest("status")).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:3000/status", {});
  });

  it("returns null for successful responses without a body", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(null, { status: 204 }));

    await expect(apiRequest("/status")).resolves.toBeNull();
  });

  it.each([
    [400, "validation"],
    [401, "unauthorized"],
    [409, "conflict"],
    [429, "throttled"],
    [503, "unavailable"],
    [500, "unexpected"],
  ] as const)("maps HTTP %s responses to %s errors", async (status, category) => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      jsonResponse({ message: "Request failed." }, status)
    );

    await expect(apiRequest("/status")).rejects.toMatchObject({
      category,
      message: "Request failed.",
      status,
    });
  });

  it("joins validation message arrays", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      jsonResponse({ message: ["email must be a valid email", "password is required"] }, 400)
    );

    await expect(apiRequest("/status")).rejects.toMatchObject({
      category: "validation",
      message: "email must be a valid email password is required",
    });
  });

  it("uses the fallback message for malformed error payloads", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(jsonResponse({ message: [] }, 400));

    await expect(apiRequest("/auth/signin")).rejects.toMatchObject({
      category: "validation",
      message: fallbackMessage,
    });
  });

  it("preserves non-JSON error response text", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("Service temporarily unavailable.", {
        status: 503,
        headers: { "Content-Type": "text/plain" },
      })
    );

    await expect(apiRequest("/status")).rejects.toMatchObject({
      category: "unavailable",
      message: "Service temporarily unavailable.",
      status: 503,
    });
  });

  it("normalizes invalid success JSON as an unexpected API client error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("not-json", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    await expect(apiRequest("/status")).rejects.toMatchObject({
      category: "unexpected",
      message: fallbackMessage,
    });
  });

  it("normalizes network failures as unavailable API client errors", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new TypeError("Failed to fetch"));

    await expect(apiRequest("/status")).rejects.toMatchObject({
      category: "unavailable",
      message: networkMessage,
    });
  });

  it("identifies ApiClientError instances without relying on instanceof at call sites", () => {
    const error = new ApiClientError("Invalid authentication token.", "unauthorized", 401);

    expect(isApiClientError(error)).toBe(true);
    expect(isApiClientError(new Error("nope"))).toBe(false);
  });
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
