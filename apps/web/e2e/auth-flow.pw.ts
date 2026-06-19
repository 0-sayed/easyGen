import { expect, test, type Locator } from "@playwright/test";

test("signs up, logs out, signs in, and opens the protected application page", async ({
  page,
}, testInfo) => {
  const email = `browser-${String(Date.now())}-${String(testInfo.workerIndex)}@example.com`;

  await page.goto("/signup");
  await fillInput(page.getByLabel("Email"), email);
  await page.getByLabel("Name").fill("Browser User");
  await fillInput(page.getByLabel("Password"), "Password1!");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.getByRole("heading", { name: "Welcome to easyGen." })).toBeVisible();
  await expect(page.getByText("Browser User")).toBeVisible();

  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page.getByRole("heading", { name: "Sign in with confidence" })).toBeVisible();

  await fillInput(page.getByLabel("Email"), email);
  await fillInput(page.getByLabel("Password"), "Password1!");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByRole("heading", { name: "Welcome to easyGen." })).toBeVisible();
  await expect(page.getByText("Browser User")).toBeVisible();
});

async function fillInput(locator: Locator, value: string): Promise<void> {
  await locator.click();
  await locator.fill(value);
}
