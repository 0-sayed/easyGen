import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";

const PASSWORD = "Password1!";
const suiteRunId = sanitizeForEmail(process.env.GITHUB_RUN_ID ?? `local-${String(Date.now())}`);

interface BrowserAccount {
  email: string;
  name: string;
}

test.describe("full-stack auth browser matrix", () => {
  test("signs up, logs out, signs in, and opens the protected application page", async ({
    page,
  }, testInfo) => {
    const account = buildAccount(testInfo, "happy");

    await page.goto("/missing-route");
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/signin");
    await expect(page.getByRole("link", { name: "Open app" })).toHaveAttribute("href", "/app");

    await createAccount(page, account);

    await expect(page.getByRole("heading", { name: "Welcome to the application." })).toBeVisible();
    await expect(page.getByText(account.name, { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page.getByRole("heading", { name: "Sign in with confidence" })).toBeVisible();

    await fillSignin(page, account.email, PASSWORD);

    await expect(page.getByRole("heading", { name: "Welcome to the application." })).toBeVisible();
    await expect(page.getByText(account.name, { exact: true })).toBeVisible();
  });

  test("unauthenticated /app redirects to signin", async ({ page }) => {
    await page.goto("/app");

    await expect(page.getByRole("heading", { name: "Sign in with confidence" })).toBeVisible();
    await expect(page).toHaveURL(/\/signin$/);
  });

  test("duplicate signup shows conflict and remains on signup", async ({ page }, testInfo) => {
    const account = buildAccount(testInfo, "duplicate");

    await createAccount(page, account);
    await expect(page.getByRole("heading", { name: "Welcome to the application." })).toBeVisible();
    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page.getByRole("heading", { name: "Sign in with confidence" })).toBeVisible();

    await page.goto("/signup");
    await fillSignupForm(page, account);
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page.getByText("A user with this email already exists.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Create account" })).toBeVisible();
  });

  test("failed signin shows error and stays on signin", async ({ page }, testInfo) => {
    const account = buildAccount(testInfo, "failed-signin");

    await createAccount(page, account);
    await expect(page.getByRole("heading", { name: "Welcome to the application." })).toBeVisible();
    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page.getByRole("heading", { name: "Sign in with confidence" })).toBeVisible();

    await fillSignin(page, account.email, "WrongPassword1!");

    await expect(page.getByText("Invalid email or password.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Sign in with confidence" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Welcome to the application." })
    ).not.toBeVisible();
  });

  test("stale session redirects to signin and clears browser token", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("easygen.accessToken", "stale-browser-token");
    });

    await page.goto("/app");

    await expect(page.getByRole("heading", { name: "Sign in with confidence" })).toBeVisible();
    await expect(page).toHaveURL(/\/signin$/);
    await expect
      .poll(async () => page.evaluate(() => window.localStorage.getItem("easygen.accessToken")))
      .toBeNull();
  });
});

function buildAccount(testInfo: TestInfo, label: string): BrowserAccount {
  const localPart = [
    "browser",
    suiteRunId,
    String(testInfo.workerIndex),
    String(testInfo.repeatEachIndex),
    String(testInfo.retry),
    label,
  ]
    .map(sanitizeForEmail)
    .join("-")
    .slice(0, 60);

  return {
    email: `${localPart}@example.com`,
    name: `Browser ${label} User`,
  };
}

async function createAccount(page: Page, account: BrowserAccount): Promise<void> {
  await page.goto("/signup");
  await fillSignupForm(page, account);
  await page.getByRole("button", { name: "Create account" }).click();
}

async function fillSignupForm(page: Page, account: BrowserAccount): Promise<void> {
  await fillInput(page.getByLabel("Email"), account.email);
  await fillInput(page.getByLabel("Name"), account.name);
  await fillInput(page.getByLabel("Password"), PASSWORD);
}

async function fillSignin(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/signin");
  await fillInput(page.getByLabel("Email"), email);
  await fillInput(page.getByLabel("Password"), password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

async function fillInput(locator: Locator, value: string): Promise<void> {
  await locator.click();
  await locator.fill(value);
}

function sanitizeForEmail(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "run"
  );
}
