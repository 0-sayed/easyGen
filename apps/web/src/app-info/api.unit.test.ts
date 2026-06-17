import { afterEach, describe, expect, it, vi } from "vitest";

const appInfo = {
  name: "easyGen",
  status: "ok",
  auth: {
    signup: true,
    signin: true,
  },
};

describe("app info api", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("loads public app info from /app-info", async () => {
    vi.stubEnv("VITE_API_URL", undefined);
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(jsonResponse(appInfo));
    const { getAppInfo } = await import("./api");

    await expect(getAppInfo()).resolves.toEqual(appInfo);

    expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:3000/app-info");
  });

  it("throws when the app info response has an unexpected shape", async () => {
    vi.stubEnv("VITE_API_URL", undefined);
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(jsonResponse({ status: "ok" }));
    const { getAppInfo } = await import("./api");

    await expect(getAppInfo()).rejects.toThrow("Unexpected app info response.");
  });
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
