import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode, type ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { App } from "../App";
import { ApiClientError } from "../api/client";
import { AuthProvider } from "../auth/AuthProvider";
import * as api from "../auth/api";
import { setAccessToken } from "../auth/session";
import * as statusApi from "../status/api";
import { resetBuildInfoForTests } from "../status/BuildInfoProvider";
import { EmailVerificationPage } from "./EmailVerificationPage";
import { SigninPage } from "./SigninPage";
import { SignupPage } from "./SignupPage";

const user = {
  id: "user-1",
  email: "person@example.com",
  name: "Person Name",
  emailVerified: true,
};

describe("SignupPage", () => {
  afterEach(() => {
    localStorage.clear();
    resetBuildInfoForTests();
    vi.restoreAllMocks();
  });

  it("shows client-side validation messages", async () => {
    renderAuthRoutes(<Route path="/signup" element={<SignupPage />} />, "/signup");

    await userEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByText("Enter a valid email address.")).toBeInTheDocument();
    expect(screen.getByText("Name must be at least 3 characters.")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Password must be at least 8 characters and include a letter, a number, and a special character."
      )
    ).toBeInTheDocument();
  });

  it("creates an account and navigates to the application", async () => {
    vi.spyOn(api, "signup").mockResolvedValueOnce({ accessToken: "token-123", user });
    renderAuthRoutes(
      <>
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/app" element={<p>Welcome to the application.</p>} />
      </>,
      "/signup"
    );

    await userEvent.type(screen.getByLabelText("Email"), "person@example.com");
    await userEvent.type(screen.getByLabelText("Name"), "Person Name");
    await userEvent.type(screen.getByLabelText("Password"), "Password1!");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => {
      expect(screen.getByText("Welcome to the application.")).toBeInTheDocument();
    });
    expect(api.signup).toHaveBeenCalledWith({
      email: "person@example.com",
      name: "Person Name",
      password: "Password1!",
    });
  });

  it("keeps the submit error slot mounted before signup fails", async () => {
    vi.spyOn(api, "signup").mockRejectedValueOnce(
      new ApiClientError("Email is already registered.", "conflict", 409)
    );
    const { container } = renderAuthRoutes(
      <Route path="/signup" element={<SignupPage />} />,
      "/signup"
    );
    const submitMessageSlot = container.querySelector('form > p[aria-live="polite"]');

    expect(submitMessageSlot).toBeInTheDocument();
    expect(submitMessageSlot).toHaveTextContent("");

    await userEvent.type(screen.getByLabelText("Email"), "person@example.com");
    await userEvent.type(screen.getByLabelText("Name"), "Person Name");
    await userEvent.type(screen.getByLabelText("Password"), "Password1!");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => {
      expect(submitMessageSlot).toHaveTextContent("Email is already registered.");
    });
  });

  it("shows the API error message when signup is rejected by the API", async () => {
    vi.spyOn(api, "signup").mockRejectedValueOnce(
      new ApiClientError("Email is already registered.", "conflict", 409)
    );
    renderAuthRoutes(<Route path="/signup" element={<SignupPage />} />, "/signup");

    await userEvent.type(screen.getByLabelText("Email"), "person@example.com");
    await userEvent.type(screen.getByLabelText("Name"), "Person Name");
    await userEvent.type(screen.getByLabelText("Password"), "Password1!");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByText("Email is already registered.")).toBeInTheDocument();
  });

  it("shows a fallback error when signup fails outside the API client", async () => {
    vi.spyOn(api, "signup").mockRejectedValueOnce(new Error("Low-level failure"));
    renderAuthRoutes(<Route path="/signup" element={<SignupPage />} />, "/signup");

    await userEvent.type(screen.getByLabelText("Email"), "person@example.com");
    await userEvent.type(screen.getByLabelText("Name"), "Person Name");
    await userEvent.type(screen.getByLabelText("Password"), "Password1!");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByText("Unable to create account.")).toBeInTheDocument();
  });
});

describe("SigninPage", () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("shows required signin validation", async () => {
    renderAuthRoutes(<Route path="/signin" element={<SigninPage />} />, "/signin");

    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("Enter a valid email address.")).toBeInTheDocument();
    expect(screen.getByText("Password is required.")).toBeInTheDocument();
  });

  it("signs in and navigates to the originally requested page", async () => {
    vi.spyOn(api, "signin").mockResolvedValueOnce({ accessToken: "token-123", user });
    renderAuthRoutes(
      <>
        <Route path="/signin" element={<SigninPage />} />
        <Route path="/app" element={<p>Welcome to the application.</p>} />
      </>,
      "/signin"
    );

    await userEvent.type(screen.getByLabelText("Email"), "person@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "Password1!");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(screen.getByText("Welcome to the application.")).toBeInTheDocument();
    });
  });

  it("falls back to the app page for protocol-relative redirect paths", async () => {
    vi.spyOn(api, "signin").mockResolvedValueOnce({ accessToken: "token-123", user });
    render(
      <MemoryRouter
        initialEntries={[{ pathname: "/signin", state: { from: { pathname: "//evil.test" } } }]}
      >
        <AuthProvider>
          <Routes>
            <Route path="/signin" element={<SigninPage />} />
            <Route path="/app" element={<p>Welcome to the application.</p>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await userEvent.type(screen.getByLabelText("Email"), "person@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "Password1!");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(screen.getByText("Welcome to the application.")).toBeInTheDocument();
    });
  });

  it("shows the API error message when signin is rejected by the API", async () => {
    vi.spyOn(api, "signin").mockRejectedValueOnce(
      new ApiClientError("Invalid email or password.", "unauthorized", 401)
    );
    renderAuthRoutes(<Route path="/signin" element={<SigninPage />} />, "/signin");

    await userEvent.type(screen.getByLabelText("Email"), "person@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "Password1!");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("Invalid email or password.")).toBeInTheDocument();
  });

  it("shows a fallback error when signin fails outside the API client", async () => {
    vi.spyOn(api, "signin").mockRejectedValueOnce(new Error("Low-level failure"));
    renderAuthRoutes(<Route path="/signin" element={<SigninPage />} />, "/signin");

    await userEvent.type(screen.getByLabelText("Email"), "person@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "Password1!");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("Unable to sign in.")).toBeInTheDocument();
  });
});

describe("EmailVerificationPage", () => {
  afterEach(() => {
    localStorage.clear();
    resetBuildInfoForTests();
    vi.restoreAllMocks();
  });

  it("confirms a valid verification link and shows success actions", async () => {
    vi.spyOn(api, "confirmEmailVerification").mockResolvedValueOnce({
      user: { ...user, emailVerified: true },
    });
    vi.spyOn(api, "requestEmailVerification").mockResolvedValueOnce({
      message: "If an account exists for that email, a verification link has been prepared.",
    });

    renderAuthRoutes(
      <Route path="/verify-email" element={<EmailVerificationPage />} />,
      "/verify-email?email=person%40example.com&token=token-123"
    );

    expect(screen.getByRole("status", { name: "Verifying your email" })).toHaveTextContent(
      "We are checking this verification link."
    );
    expect(await screen.findByRole("heading", { name: "Email verified" })).toBeInTheDocument();
    expect(screen.getByText("person@example.com")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/signin");
    expect(screen.getByRole("link", { name: "Open app" })).toHaveAttribute("href", "/app");
    expect(api.confirmEmailVerification).toHaveBeenCalledWith({
      email: "person@example.com",
      token: "token-123",
    });
  });

  it("shares the confirmation request across StrictMode remounts", async () => {
    const confirmEmailVerification = vi.spyOn(api, "confirmEmailVerification").mockResolvedValue({
      user: { ...user, emailVerified: true },
    });

    render(
      <StrictMode>
        <MemoryRouter initialEntries={["/verify-email?email=person%40example.com&token=token-123"]}>
          <AuthProvider>
            <Routes>
              <Route path="/verify-email" element={<EmailVerificationPage />} />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      </StrictMode>
    );

    expect(await screen.findByRole("heading", { name: "Email verified" })).toBeInTheDocument();
    expect(confirmEmailVerification).toHaveBeenCalledOnce();
  });

  it("does not call the confirm API when the link is missing parameters", async () => {
    const confirm = vi.spyOn(api, "confirmEmailVerification");
    renderAuthRoutes(
      <Route path="/verify-email" element={<EmailVerificationPage />} />,
      "/verify-email?email=person%40example.com"
    );

    expect(
      await screen.findByRole("heading", { name: "Verification link invalid or expired" })
    ).toBeInTheDocument();
    expect(screen.getByText("Request a new verification email.")).toBeInTheDocument();
    expect(confirm).not.toHaveBeenCalled();
  });

  it("shows recovery copy when the token is rejected", async () => {
    vi.spyOn(api, "confirmEmailVerification").mockRejectedValueOnce(
      new ApiClientError("Verification token is invalid or expired.", "validation", 400)
    );
    renderAuthRoutes(
      <Route path="/verify-email" element={<EmailVerificationPage />} />,
      "/verify-email?email=person%40example.com&token=bad-token"
    );

    expect(
      await screen.findByRole("heading", { name: "Verification link invalid or expired" })
    ).toBeInTheDocument();
    expect(screen.getByText("Request a new verification email.")).toBeInTheDocument();
  });

  it("requests a new verification email from the recovery form", async () => {
    vi.spyOn(api, "confirmEmailVerification").mockRejectedValueOnce(
      new ApiClientError("Verification token is invalid or expired.", "validation", 400)
    );
    vi.spyOn(api, "requestEmailVerification").mockResolvedValueOnce({
      message: "If an account exists for that email, a verification link has been prepared.",
    });
    renderAuthRoutes(
      <Route path="/verify-email" element={<EmailVerificationPage />} />,
      "/verify-email?email=person%40example.com&token=bad-token"
    );

    await screen.findByRole("heading", { name: "Verification link invalid or expired" });
    await userEvent.clear(screen.getByLabelText("Email"));
    await userEvent.type(screen.getByLabelText("Email"), "person@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Request verification email" }));

    expect(
      await screen.findByText(
        "If an account exists for that email, a verification link has been prepared."
      )
    ).toBeInTheDocument();
    expect(api.requestEmailVerification).toHaveBeenCalledWith({
      email: "person@example.com",
    });
  });
});

describe("App routes", () => {
  afterEach(() => {
    localStorage.clear();
    resetBuildInfoForTests();
    vi.restoreAllMocks();
  });

  it("redirects unauthenticated users from /app to /signin and shows the build badge", async () => {
    vi.spyOn(statusApi, "getBuildInfo").mockResolvedValueOnce({
      service: "easygen-api",
      version: "0.1.0",
      environment: "test",
    });

    render(
      <MemoryRouter initialEntries={["/app"]}>
        <App />
      </MemoryRouter>
    );

    expect(
      await screen.findByRole("heading", { name: "Sign in with confidence" })
    ).toBeInTheDocument();
    expect(await screen.findByText("easygen-api")).toBeInTheDocument();
    expect(screen.getByText("v0.1.0")).toBeInTheDocument();
    expect(screen.getByText("test")).toBeInTheDocument();
  });

  it("shows saved-token loading status before opening the app", async () => {
    let resolveCurrentUser: ((currentUser: typeof user) => void) | undefined;
    vi.spyOn(api, "getCurrentUser").mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveCurrentUser = resolve;
        })
    );
    vi.spyOn(api, "getAccountActivity").mockResolvedValueOnce({
      activities: [],
      limit: 20,
    });
    vi.spyOn(statusApi, "getBuildInfo").mockRejectedValueOnce(new Error("status unavailable"));
    setAccessToken("token-123");

    render(
      <MemoryRouter initialEntries={["/app"]}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByRole("status", { name: "Checking your session" })).toHaveTextContent(
      "We are confirming your saved sign-in before opening the app."
    );
    expect(
      screen.queryByRole("heading", { name: "Sign in with confidence" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Welcome to the application." })
    ).not.toBeInTheDocument();

    if (resolveCurrentUser === undefined) {
      throw new Error("Expected getCurrentUser resolver to be initialized.");
    }
    resolveCurrentUser(user);

    expect(
      await screen.findByRole("heading", { name: "Welcome to the application." })
    ).toBeInTheDocument();
  });

  it("clears a stale stored token and returns the protected app route to signin", async () => {
    vi.spyOn(api, "getCurrentUser").mockRejectedValueOnce(
      new ApiClientError("Invalid authentication token.", "unauthorized", 401)
    );
    vi.spyOn(statusApi, "getBuildInfo").mockRejectedValueOnce(new Error("status unavailable"));
    setAccessToken("stale-token");

    render(
      <MemoryRouter initialEntries={["/app"]}>
        <App />
      </MemoryRouter>
    );

    expect(
      await screen.findByRole("heading", { name: "Sign in with confidence" })
    ).toBeInTheDocument();
    expect(localStorage.getItem("easygen.accessToken")).toBeNull();
  });

  it("restores a valid stored token without a fresh signin", async () => {
    vi.spyOn(api, "getCurrentUser").mockResolvedValueOnce(user);
    vi.spyOn(api, "getAccountActivity").mockResolvedValueOnce({
      activities: [
        {
          id: "activity-1",
          type: "auth.signed_in",
          description: "Signed in",
          occurredAt: "2026-06-24T12:00:00.000Z",
        },
      ],
      limit: 20,
    });
    vi.spyOn(statusApi, "getBuildInfo").mockResolvedValueOnce({
      service: "easygen-api",
      version: "0.1.0",
      environment: "test",
    });
    setAccessToken("token-123");

    render(
      <MemoryRouter initialEntries={["/app"]}>
        <App />
      </MemoryRouter>
    );

    expect(
      await screen.findByRole("heading", { name: "Welcome to the application." })
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Account summary" })).toBeInTheDocument();
    expect(screen.getByText("Person Name")).toBeInTheDocument();
    expect(screen.getByText("person@example.com")).toBeInTheDocument();
    expect(screen.getByText("user-1")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Recent activity" })).toBeInTheDocument();
    expect(screen.getByText("Signed in")).toBeInTheDocument();
    expect(screen.queryByText("activity-1")).not.toBeInTheDocument();
    expect(screen.queryByText("auth.signed_in")).not.toBeInTheDocument();
    expect(await screen.findByRole("status", { name: "API connection" })).toHaveTextContent(
      "API connected"
    );
    expect(api.getCurrentUser).toHaveBeenCalledWith("token-123");
    expect(api.getAccountActivity).toHaveBeenCalledWith("token-123");
    expect(statusApi.getBuildInfo).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("easygen.accessToken")).toBe("token-123");
  });

  it("keeps the application usable when the in-page status request fails", async () => {
    vi.spyOn(api, "getCurrentUser").mockResolvedValueOnce(user);
    vi.spyOn(api, "getAccountActivity").mockResolvedValueOnce({
      activities: [],
      limit: 20,
    });
    vi.spyOn(statusApi, "getBuildInfo").mockRejectedValueOnce(new Error("status unavailable"));
    setAccessToken("token-123");

    render(
      <MemoryRouter initialEntries={["/app"]}>
        <App />
      </MemoryRouter>
    );

    expect(
      await screen.findByRole("heading", { name: "Welcome to the application." })
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Account summary" })).toBeInTheDocument();
    expect(screen.getByText("Person Name")).toBeInTheDocument();
    expect(screen.getByText("person@example.com")).toBeInTheDocument();
    expect(screen.getByText("user-1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument();
    expect(
      await screen.findByRole("status", { name: "API connection unavailable" })
    ).toHaveTextContent("API status unavailable");
    expect(
      screen.queryByRole("status", { name: "API status unavailable" })
    ).not.toBeInTheDocument();
  });

  it("keeps the application usable when account activity fails", async () => {
    vi.spyOn(api, "getCurrentUser").mockResolvedValueOnce(user);
    vi.spyOn(api, "getAccountActivity").mockRejectedValueOnce(new Error("activity unavailable"));
    vi.spyOn(statusApi, "getBuildInfo").mockRejectedValueOnce(new Error("status unavailable"));
    setAccessToken("token-123");

    render(
      <MemoryRouter initialEntries={["/app"]}>
        <App />
      </MemoryRouter>
    );

    expect(
      await screen.findByRole("heading", { name: "Welcome to the application." })
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Account summary" })).toBeInTheDocument();
    expect(screen.getByText("person@example.com")).toBeInTheDocument();
    expect(
      await screen.findByRole("status", { name: "Account activity unavailable" })
    ).toHaveTextContent("Recent account activity is unavailable.");
    expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument();
  });

  it("renders the email verification route as a public page", async () => {
    vi.spyOn(statusApi, "getBuildInfo").mockRejectedValueOnce(new Error("status unavailable"));
    vi.spyOn(api, "confirmEmailVerification").mockResolvedValueOnce({
      user: { ...user, emailVerified: true },
    });

    render(
      <MemoryRouter initialEntries={["/verify-email?email=person%40example.com&token=token-123"]}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByRole("heading", { name: "Email verified" })).toBeInTheDocument();
    expect(api.confirmEmailVerification).toHaveBeenCalledWith({
      email: "person@example.com",
      token: "token-123",
    });
  });

  it("renders the authenticated app heading and logs out clearing localStorage", async () => {
    vi.spyOn(api, "getCurrentUser").mockResolvedValueOnce(user);
    vi.spyOn(api, "getAccountActivity").mockResolvedValueOnce({
      activities: [],
      limit: 20,
    });
    const logout = vi.spyOn(api, "logout").mockResolvedValueOnce(undefined);
    vi.spyOn(statusApi, "getBuildInfo").mockRejectedValueOnce(new Error("status unavailable"));
    setAccessToken("token-123");

    render(
      <MemoryRouter initialEntries={["/app"]}>
        <App />
      </MemoryRouter>
    );

    expect(
      await screen.findByRole("heading", { name: "Welcome to the application." })
    ).toBeInTheDocument();
    expect(screen.getByText("Person Name")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Log out" }));

    expect(
      await screen.findByRole("heading", { name: "Sign in with confidence" })
    ).toBeInTheDocument();
    expect(logout).toHaveBeenCalledWith("token-123");
    expect(localStorage.getItem("easygen.accessToken")).toBeNull();
  });

  it("keeps signin usable when the status request fails", async () => {
    vi.spyOn(statusApi, "getBuildInfo").mockRejectedValueOnce(new Error("status unavailable"));
    vi.spyOn(api, "signin").mockResolvedValueOnce({ accessToken: "token-123", user });
    vi.spyOn(api, "getAccountActivity").mockResolvedValueOnce({
      activities: [],
      limit: 20,
    });

    render(
      <MemoryRouter initialEntries={["/signin"]}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByRole("status", { name: "API status unavailable" })).toHaveTextContent(
      "API status unavailable"
    );

    await userEvent.type(screen.getByLabelText("Email"), "person@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "Password1!");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(
      await screen.findByRole("heading", { name: "Welcome to the application." })
    ).toBeInTheDocument();
    expect(localStorage.getItem("easygen.accessToken")).toBe("token-123");
  });

  it("keeps signup usable when the status request fails", async () => {
    vi.spyOn(statusApi, "getBuildInfo").mockRejectedValueOnce(new Error("status unavailable"));
    vi.spyOn(api, "signup").mockResolvedValueOnce({ accessToken: "token-123", user });
    vi.spyOn(api, "getAccountActivity").mockResolvedValueOnce({
      activities: [],
      limit: 20,
    });

    render(
      <MemoryRouter initialEntries={["/signup"]}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByRole("status", { name: "API status unavailable" })).toHaveTextContent(
      "API status unavailable"
    );

    await userEvent.type(screen.getByLabelText("Email"), "person@example.com");
    await userEvent.type(screen.getByLabelText("Name"), "Person Name");
    await userEvent.type(screen.getByLabelText("Password"), "Password1!");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(
      await screen.findByRole("heading", { name: "Welcome to the application." })
    ).toBeInTheDocument();
    expect(localStorage.getItem("easygen.accessToken")).toBe("token-123");
  });

  it("renders a public not-found page for unknown routes", async () => {
    vi.spyOn(statusApi, "getBuildInfo").mockRejectedValueOnce(new Error("status unavailable"));

    render(
      <MemoryRouter initialEntries={["/missing-route"]}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByRole("heading", { name: "Page not found" })).toBeInTheDocument();
    expect(screen.getByText("This route does not exist.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/signin");
    expect(screen.getByRole("link", { name: "Open app" })).toHaveAttribute("href", "/app");
  });
});

function renderAuthRoutes(children: ReactNode, initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AuthProvider>
        <Routes>{children}</Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}
