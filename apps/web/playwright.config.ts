import { defineConfig, devices } from "@playwright/test";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));

const DEFAULT_API_PORT = 3000;
const DEFAULT_MONGODB_PORT = 27018;
const DEFAULT_WEB_PORT = 5173;

const apiPort = resolvePort(process.env.PORT, DEFAULT_API_PORT);
const mongodbPort = resolvePort(process.env.MONGODB_PORT, DEFAULT_MONGODB_PORT);
const webPort = resolvePort(process.env.WEB_PORT, DEFAULT_WEB_PORT);
const apiUrl = `http://127.0.0.1:${String(apiPort)}`;
const webUrl = `http://127.0.0.1:${String(webPort)}`;

export default defineConfig({
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? "github" : "list",
  testDir: "./e2e",
  testMatch: "**/*.pw.ts",
  timeout: 30_000,
  use: {
    baseURL: webUrl,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "pnpm infra:up && pnpm --filter @easygen/api dev",
      cwd: repoRoot,
      env: {
        AUTH_TEST_SUPPORT: "1",
        AUTH_THROTTLE_LIMIT: "7",
        JWT_SECRET: "playwright-test-secret",
        LOG_LEVEL: "silent",
        MONGODB_PORT: String(mongodbPort),
        MONGODB_URI: `mongodb://127.0.0.1:${String(mongodbPort)}/easygen_browser?directConnection=true`,
        NODE_ENV: "test",
        PORT: String(apiPort),
        WEB_PORT: String(webPort),
      },
      name: "api",
      reuseExistingServer: false,
      timeout: 120_000,
      url: `${apiUrl}/health`,
    },
    {
      command: "pnpm --filter @easygen/web dev",
      cwd: repoRoot,
      env: {
        VITE_API_URL: apiUrl,
        WEB_PORT: String(webPort),
      },
      name: "web",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      url: webUrl,
    },
  ],
});

function resolvePort(value: string | undefined, fallback: number): number {
  const candidate = value?.trim();

  if (candidate === undefined || !/^\d+$/.test(candidate)) {
    return fallback;
  }

  const parsed = Number.parseInt(candidate, 10);
  return parsed > 0 && parsed <= 65_535 ? parsed : fallback;
}
