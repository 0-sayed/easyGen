import { afterEach, describe, expect, it, vi } from "vitest";

describe("api base url", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("uses the default API URL when VITE_API_URL is undefined", async () => {
    vi.stubEnv("VITE_API_URL", undefined);

    await expect(loadApiUrl()).resolves.toBe("http://127.0.0.1:3000");
  });

  it("uses the default API URL when VITE_API_URL is blank", async () => {
    vi.stubEnv("VITE_API_URL", "   ");

    await expect(loadApiUrl()).resolves.toBe("http://127.0.0.1:3000");
  });

  it("trims VITE_API_URL overrides", async () => {
    vi.stubEnv("VITE_API_URL", "  http://127.0.0.1:4000  ");

    await expect(loadApiUrl()).resolves.toBe("http://127.0.0.1:4000");
  });

  it("removes a trailing slash from VITE_API_URL overrides", async () => {
    vi.stubEnv("VITE_API_URL", "http://127.0.0.1:4000/");

    await expect(loadApiUrl()).resolves.toBe("http://127.0.0.1:4000");
  });
});

async function loadApiUrl(): Promise<string> {
  vi.resetModules();
  const { API_URL } = await import("./base-url");
  return API_URL;
}
