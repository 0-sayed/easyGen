import { expect, test, type Page, type Response } from "@playwright/test";

const DEFAULT_API_PORT = 3000;
const apiBaseUrl = `http://127.0.0.1:${String(resolvePort(process.env.PORT, DEFAULT_API_PORT))}`;

interface BuildInfo {
  service: "easygen-api";
  version: string;
  environment: string;
}

interface HealthInfo {
  status: "ok";
  service: "easygen-api";
  scope: "process";
  uptimeSeconds: number;
}

interface ViewportSize {
  width: number;
  height: number;
}

test.describe("public diagnostics contract matrix", () => {
  test("renders live diagnostics on the public status surface", async ({ page }) => {
    await assertPublicDiagnostics(page, { width: 1280, height: 720 }, "desktop");
    await assertPublicDiagnostics(page, { width: 390, height: 844 }, "mobile");
  });
});

async function assertPublicDiagnostics(
  page: Page,
  viewport: ViewportSize,
  label: "desktop" | "mobile"
): Promise<void> {
  await page.setViewportSize(viewport);

  const [statusResponse, healthResponse] = await Promise.all([
    page.waitForResponse((response) => isApiGet(response, "/status")),
    page.waitForResponse((response) => isApiGet(response, "/health")),
    page.goto(`/signin?diagnostics-contract=${label}`),
  ]);

  expect(statusResponse.ok(), "GET /status should be publicly accessible").toBe(true);
  expect(healthResponse.ok(), "GET /health should be publicly accessible").toBe(true);

  const buildInfo = await parseBuildInfo(statusResponse);
  const healthInfo = await parseHealthInfo(healthResponse);

  await expect(page.getByRole("heading", { name: "Sign in with confidence" })).toBeVisible();

  const diagnostics = page.getByRole("status", {
    name: "API build and liveness information",
  });
  await expect(diagnostics).toBeVisible();
  await expect(diagnostics).toHaveAttribute("aria-live", "polite");
  await expect(diagnostics).toHaveAttribute("aria-atomic", "true");
  await expect(diagnostics).toContainText(buildInfo.service);
  await expect(diagnostics).toContainText(`v${buildInfo.version}`);
  await expect(diagnostics).toContainText(buildInfo.environment);
  await expect(diagnostics).toContainText(healthInfo.scope);
  await expect(diagnostics).toContainText(`up ${formatUptime(healthInfo.uptimeSeconds)}`);

  await expectNoHorizontalOverflow(page);
}

function isApiGet(response: Response, path: "/status" | "/health"): boolean {
  return response.url() === `${apiBaseUrl}${path}` && response.request().method() === "GET";
}

async function parseBuildInfo(response: Response): Promise<BuildInfo> {
  const body: unknown = await response.json();

  if (
    !isObject(body) ||
    body.service !== "easygen-api" ||
    typeof body.version !== "string" ||
    body.version.trim() === "" ||
    typeof body.environment !== "string" ||
    body.environment.trim() === ""
  ) {
    throw new Error("Unexpected public status response.");
  }

  return {
    service: body.service,
    version: body.version,
    environment: body.environment,
  };
}

async function parseHealthInfo(response: Response): Promise<HealthInfo> {
  const body: unknown = await response.json();

  if (
    !isObject(body) ||
    body.status !== "ok" ||
    body.service !== "easygen-api" ||
    body.scope !== "process" ||
    typeof body.uptimeSeconds !== "number" ||
    !Number.isInteger(body.uptimeSeconds) ||
    body.uptimeSeconds < 0
  ) {
    throw new Error("Unexpected public health response.");
  }

  return {
    status: body.status,
    service: body.service,
    scope: body.scope,
    uptimeSeconds: body.uptimeSeconds,
  };
}

function formatUptime(seconds: number): string {
  if (seconds < 60) {
    return "< 1 minute";
  }

  if (seconds < 3_600) {
    return formatUnit(Math.floor(seconds / 60), "minute");
  }

  if (seconds < 86_400) {
    return formatUnit(Math.floor(seconds / 3_600), "hour");
  }

  return formatUnit(Math.floor(seconds / 86_400), "day");
}

function formatUnit(value: number, unit: "minute" | "hour" | "day"): string {
  return `${String(value)} ${unit}${value === 1 ? "" : "s"}`;
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth
  );

  expect(hasOverflow).toBe(false);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function resolvePort(value: string | undefined, fallback: number): number {
  const candidate = value?.trim();

  if (candidate === undefined || !/^\d+$/.test(candidate)) {
    return fallback;
  }

  const parsed = Number.parseInt(candidate, 10);
  return parsed > 0 && parsed <= 65_535 ? parsed : fallback;
}
