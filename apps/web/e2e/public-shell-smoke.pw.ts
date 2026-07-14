import { expect, test, type Page } from "@playwright/test";

interface ViewportSize {
  width: number;
  height: number;
}

test.describe("public shell browser smoke contract", () => {
  test("renders the public sign-in shell and diagnostics without overflow", async ({ page }) => {
    await assertPublicShell(page, { width: 1280, height: 720 }, "desktop");
    await assertPublicShell(page, { width: 390, height: 844 }, "mobile");
  });
});

async function assertPublicShell(
  page: Page,
  viewport: ViewportSize,
  label: "desktop" | "mobile"
): Promise<void> {
  await page.setViewportSize(viewport);
  await page.goto(`/signin?public-shell-smoke=${label}`);

  await expect(page.getByRole("heading", { name: "Sign in with confidence" })).toBeVisible();
  await expect(page.getByLabel("API build and liveness information")).toBeVisible();
  await expectNoHorizontalOverflow(page);
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth
  );

  expect(hasOverflow, "public sign-in shell should not horizontally overflow").toBe(false);
}
