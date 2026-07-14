import { afterEach, describe, expect, it, vi } from "vitest";

describe("playwright config", () => {
  afterEach(() => {
    delete process.env.PLAYWRIGHT_APP_URL;
    vi.resetModules();
  });

  it("uses an external app URL without starting managed web servers", async () => {
    process.env.PLAYWRIGHT_APP_URL = " http://localhost:53725/ ";

    const config = await loadConfig();

    expect(config.use?.baseURL).toBe("http://localhost:53725/");
    expect(config.webServer).toBeUndefined();
  });
});

async function loadConfig() {
  vi.resetModules();

  const { default: config } = await import("./playwright.config");

  return config;
}
