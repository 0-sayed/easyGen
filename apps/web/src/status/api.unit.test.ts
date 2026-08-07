import { afterEach, describe, expect, it, vi } from "vitest";

import { getBuildInfo, getHealthInfo } from "./api";

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();
const expectedApiUrl =
  configuredApiUrl === undefined || configuredApiUrl.length === 0
    ? "http://127.0.0.1:3000"
    : configuredApiUrl;

const buildInfo = {
  service: "easygen-api",
  version: "0.1.0",
  environment: "test",
  source: "runtime",
} as const;

const healthInfo = {
  status: "ok",
  service: "easygen-api",
  scope: "process",
  uptimeSeconds: 125,
} as const;

describe("status api", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("loads build information from /status", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(jsonResponse(buildInfo));

    await expect(getBuildInfo()).resolves.toEqual(buildInfo);

    expect(fetchMock).toHaveBeenCalledWith(`${expectedApiUrl}/status`, {});
  });

  it("loads health information from /health", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(jsonResponse(healthInfo));

    await expect(getHealthInfo()).resolves.toEqual(healthInfo);

    expect(fetchMock).toHaveBeenCalledWith(`${expectedApiUrl}/health`, {});
  });

  it("loads build information from the configured API URL", async () => {
    vi.resetModules();
    vi.stubEnv("VITE_API_URL", "  http://127.0.0.1:3010  ");
    const { getBuildInfo: getConfiguredBuildInfo } = await import("./api");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(jsonResponse(buildInfo));

    await expect(getConfiguredBuildInfo()).resolves.toEqual(buildInfo);

    expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:3010/status", {});
  });

  it("rejects non-OK responses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(jsonResponse({ message: "nope" }, 500));

    await expect(getBuildInfo()).rejects.toMatchObject({
      name: "ApiClientError",
      category: "unexpected",
      message: "nope",
      status: 500,
    });
  });

  it("rejects unexpected build response shapes", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      jsonResponse({ service: "easygen-api", version: "0.1.0" })
    );

    await expect(getBuildInfo()).rejects.toMatchObject({
      category: "unexpected",
      message: "Unexpected API status response.",
    });
  });

  it("rejects unexpected build source values", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      jsonResponse({
        service: "easygen-api",
        version: "0.1.0",
        environment: "test",
        source: "static",
      })
    );

    await expect(getBuildInfo()).rejects.toMatchObject({
      category: "unexpected",
      message: "Unexpected API status response.",
    });
  });

  it("rejects unexpected health response shapes", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      jsonResponse({
        status: "ok",
        service: "easygen-api",
        scope: "database",
        uptimeSeconds: 125,
      })
    );

    await expect(getHealthInfo()).rejects.toMatchObject({
      category: "unexpected",
      message: "Unexpected API health response.",
    });
  });

  it("rejects negative uptime values", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      jsonResponse({
        status: "ok",
        service: "easygen-api",
        scope: "process",
        uptimeSeconds: -1,
      })
    );

    await expect(getHealthInfo()).rejects.toMatchObject({
      category: "unexpected",
      message: "Unexpected API health response.",
    });
  });

  it("rejects fractional uptime values", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      jsonResponse({
        status: "ok",
        service: "easygen-api",
        scope: "process",
        uptimeSeconds: 1.5,
      })
    );

    await expect(getHealthInfo()).rejects.toMatchObject({
      category: "unexpected",
      message: "Unexpected API health response.",
    });
  });

  it("rejects invalid JSON responses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("not-json", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    await expect(getBuildInfo()).rejects.toMatchObject({
      category: "unexpected",
      message: "Something went wrong. Please try again.",
    });
  });
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
