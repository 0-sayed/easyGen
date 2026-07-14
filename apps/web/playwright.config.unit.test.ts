import { afterEach, describe, expect, it, vi } from "vitest";

describe("playwright config", () => {
  afterEach(() => {
    delete process.env.PLAYWRIGHT_APP_URL;
    vi.resetModules();
  });

  it("uses an external app URL while keeping the managed API server", async () => {
    process.env.PLAYWRIGHT_APP_URL = " http://localhost:53725/ ";

    const config = await loadConfig();

    expect(config.use?.baseURL).toBe("http://localhost:53725/");
    expect(config.webServer).toEqual([
      expect.objectContaining({
        env: expect.objectContaining({
          AUTH_TEST_SUPPORT: "1",
        }),
        name: "api",
        url: "http://127.0.0.1:3000/health",
      }),
    ]);
  });
});

async function loadConfig() {
  vi.resetModules();

  const { default: config } = await import("./playwright.config");

  return config;
}
