import {
  expect,
  test,
  type APIRequestContext,
  type Locator,
  type Page,
  type TestInfo,
} from "@playwright/test";

const PASSWORD = "Password1!";
const NEW_PASSWORD = "NewPassword1!";
const suiteRunId = sanitizeForEmail(process.env.GITHUB_RUN_ID ?? `local-${String(Date.now())}`);
const DEFAULT_API_PORT = 3000;
const apiBaseUrl = `http://127.0.0.1:${String(resolvePort(process.env.PORT, DEFAULT_API_PORT))}`;

interface BrowserAccount {
  email: string;
  name: string;
}

interface DeliveredAuthTokenMessage {
  email: string;
  expiresAt: string;
  token: string;
}

interface DeliveredAuthTokenResponse {
  messages: DeliveredAuthTokenMessage[];
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
    await expect(page.getByRole("heading", { name: "Account summary" })).toBeVisible();
    const accountSummary = page.getByRole("region", { name: "Account summary" });
    await expect(accountSummary.getByText(account.name, { exact: true })).toBeVisible();
    await expect(accountSummary.getByText(account.email, { exact: true })).toBeVisible();
    await expect(page.getByRole("status", { name: "API connection" })).toContainText(
      "API connected"
    );

    const updatedName = `${account.name} Updated`;
    const newPassword = "NewPassword1!";

    await fillInput(page.getByLabel("Name"), updatedName);
    await page.getByRole("button", { name: "Save profile" }).click();
    await expect(page.getByText("Profile updated.")).toBeVisible();
    await expect(page.getByText(`Signed in as ${updatedName}.`)).toBeVisible();
    await expect(accountSummary.getByText(updatedName, { exact: true })).toBeVisible();

    await fillInput(page.getByLabel("Current password"), PASSWORD);
    await fillInput(page.getByLabel("New password", { exact: true }), newPassword);
    await fillInput(page.getByLabel("Confirm new password"), newPassword);
    await page.getByRole("button", { name: "Change password" }).click();
    await expect(page.getByText("Password changed.")).toBeVisible();

    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page.getByRole("heading", { name: "Sign in with confidence" })).toBeVisible();

    await fillSignin(page, account.email, PASSWORD);
    await expect(page.getByText("Invalid email or password.")).toBeVisible();

    await fillSignin(page, account.email, newPassword);

    await expect(page.getByRole("heading", { name: "Welcome to the application." })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Account summary" })).toBeVisible();
    await expect(accountSummary.getByText(updatedName, { exact: true })).toBeVisible();
    await expect(accountSummary.getByText(account.email, { exact: true })).toBeVisible();
    await expect(page.getByRole("status", { name: "API connection" })).toContainText(
      "API connected"
    );
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

    await expect(
      page.getByText("Unable to create account with the provided details.")
    ).toBeVisible();
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

  test("verifies email recovery links and explains invalid verification tokens", async ({
    page,
    request,
  }, testInfo) => {
    const account = buildAccount(testInfo, "email-recovery");

    await createAccount(page, account);
    await expect(page.getByRole("heading", { name: "Welcome to the application." })).toBeVisible();
    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page.getByRole("heading", { name: "Sign in with confidence" })).toBeVisible();

    await page.goto(buildRecoveryUrl("/verify-email", account.email, "invalid-verification-token"));

    await expect(
      page.getByRole("heading", { name: "Verification link invalid or expired" })
    ).toBeVisible();
    await expect(
      page.getByText(
        "This verification link is invalid or expired. Request a new verification email to continue."
      )
    ).toBeVisible();

    await page.getByRole("button", { name: "Request verification email" }).click();
    await expect(
      page.getByText("If an account exists for that email, a verification link has been prepared.")
    ).toBeVisible();

    const token = await drainDeliveredToken(
      request,
      "/__test/auth-tokens/verification",
      account.email,
      "email verification"
    );

    await page.goto(buildRecoveryUrl("/verify-email", account.email, token));

    await expect(page.getByRole("heading", { name: "Email verified" })).toBeVisible();
    await expect(page.getByText("Your email address has been verified.")).toBeVisible();
    await expect(page.getByText(account.email, { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/signin");
  });

  test("requests a password reset link and signs in with the new password", async ({
    page,
    request,
  }, testInfo) => {
    const account = buildAccount(testInfo, "password-recovery");

    await createAccount(page, account);
    await expect(page.getByRole("heading", { name: "Welcome to the application." })).toBeVisible();
    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page.getByRole("heading", { name: "Sign in with confidence" })).toBeVisible();

    await page.goto("/forgot-password");
    await fillInput(page.getByLabel("Email"), account.email);
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(
      page.getByText(
        "If an account exists for that email, a password reset link has been prepared."
      )
    ).toBeVisible();

    const token = await drainDeliveredToken(
      request,
      "/__test/auth-tokens/password-reset",
      account.email,
      "password reset"
    );

    await page.goto(buildRecoveryUrl("/reset-password", account.email, token));
    await fillInput(page.getByLabel("New password", { exact: true }), NEW_PASSWORD);
    await fillInput(page.getByLabel("Confirm new password"), NEW_PASSWORD);
    await page.getByRole("button", { name: "Reset password" }).click();

    await expect(page.getByRole("heading", { name: "Password updated" })).toBeVisible();
    await expect(page.getByText("Password has been reset.")).toBeVisible();

    await page.getByRole("link", { name: "Sign in" }).click();
    await fillSignin(page, account.email, PASSWORD);
    await expect(page.getByText("Invalid email or password.")).toBeVisible();

    await fillSignin(page, account.email, NEW_PASSWORD);
    await expect(page.getByRole("heading", { name: "Welcome to the application." })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Account summary" })).toBeVisible();
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

async function drainDeliveredToken(
  request: APIRequestContext,
  path: "/__test/auth-tokens/verification" | "/__test/auth-tokens/password-reset",
  email: string,
  tokenType: string
): Promise<string> {
  const response = await request.get(`${apiBaseUrl}${path}`);
  expect(response.ok(), `${tokenType} token drain endpoint should respond successfully`).toBe(true);

  const body = await parseDeliveredAuthTokenResponse(response);
  const message = body.messages.find((candidate) => candidate.email === email);
  const drainedEmails = body.messages.map((candidate) => candidate.email).join(", ");

  expect(
    message,
    `Expected ${tokenType} token for ${email}. Drained token emails: ${drainedEmails || "none"}.`
  ).toBeDefined();
  if (message === undefined) {
    throw new Error(
      `Expected ${tokenType} token for ${email}. Drained token emails: ${drainedEmails || "none"}.`
    );
  }

  return message.token;
}

async function parseDeliveredAuthTokenResponse(
  response: Awaited<ReturnType<APIRequestContext["get"]>>
): Promise<DeliveredAuthTokenResponse> {
  const body: unknown = await response.json();

  if (
    typeof body !== "object" ||
    body === null ||
    !("messages" in body) ||
    !Array.isArray(body.messages) ||
    !body.messages.every(isDeliveredAuthTokenMessage)
  ) {
    throw new Error("Unexpected auth token drain response.");
  }

  return { messages: body.messages };
}

function isDeliveredAuthTokenMessage(value: unknown): value is DeliveredAuthTokenMessage {
  return (
    typeof value === "object" &&
    value !== null &&
    "email" in value &&
    typeof value.email === "string" &&
    "expiresAt" in value &&
    typeof value.expiresAt === "string" &&
    "token" in value &&
    typeof value.token === "string"
  );
}

function buildRecoveryUrl(
  path: "/verify-email" | "/reset-password",
  email: string,
  token: string
): string {
  const params = new URLSearchParams({ email, token });
  return `${path}?${params.toString()}`;
}

function resolvePort(value: string | undefined, fallback: number): number {
  const candidate = value?.trim();

  if (candidate === undefined || !/^\d+$/.test(candidate)) {
    return fallback;
  }

  const parsed = Number.parseInt(candidate, 10);
  return parsed > 0 && parsed <= 65_535 ? parsed : fallback;
}

function sanitizeForEmail(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "run"
  );
}
