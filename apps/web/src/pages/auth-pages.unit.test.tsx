import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode, type ReactNode } from "react";
import { Link, MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { App } from "../App";
import { ApiClientError } from "../api/client";
import { AuthProvider } from "../auth/AuthProvider";
import * as api from "../auth/api";
import { setAccessToken } from "../auth/session";
import * as statusApi from "../status/api";
import { resetBuildInfoForTests } from "../status/BuildInfoProvider";
import { RequestPasswordResetPage } from "./RequestPasswordResetPage";
import { ResetPasswordPage } from "./ResetPasswordPage";
import { EmailVerificationPage } from "./EmailVerificationPage";
import { SigninPage } from "./SigninPage";
import { SignupPage } from "./SignupPage";

const user = {
  id: "user-1",
  email: "person@example.com",
  name: "Person Name",
  emailVerified: true,
};

const buildInfo = {
  service: "easygen-api",
  version: "0.1.0",
  environment: "test",
} as const;

const healthInfo = {
  status: "ok",
  service: "easygen-api",
  scope: "process",
  uptimeSeconds: 125,
} as const;

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

  it("reveals and hides the signup password without submitting", async () => {
    const signupSpy = vi.spyOn(api, "signup").mockResolvedValueOnce({
      accessToken: "token-123",
      user,
    });
    renderAuthRoutes(<Route path="/signup" element={<SignupPage />} />, "/signup");

    const passwordInput = screen.getByLabelText("Password");

    await userEvent.type(passwordInput, "Password1!");

    expect(passwordInput).toHaveAttribute("type", "password");

    const showPasswordButton = screen.getByRole("button", { name: "Show password" });

    expect(showPasswordButton).toHaveAttribute("type", "button");

    await userEvent.click(showPasswordButton);

    expect(passwordInput).toHaveAttribute("type", "text");
    expect(passwordInput).toHaveValue("Password1!");
    expect(passwordInput).toHaveFocus();
    expect(screen.getByRole("button", { name: "Hide password" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Hide password" }));

    expect(passwordInput).toHaveAttribute("type", "password");
    expect(passwordInput).toHaveValue("Password1!");
    expect(passwordInput).toHaveFocus();
    expect(signupSpy).not.toHaveBeenCalled();
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

  it("reveals and hides the signin password without submitting", async () => {
    const signinSpy = vi.spyOn(api, "signin").mockResolvedValueOnce({
      accessToken: "token-123",
      user,
    });
    renderAuthRoutes(<Route path="/signin" element={<SigninPage />} />, "/signin");

    const passwordInput = screen.getByLabelText("Password");

    await userEvent.type(passwordInput, "Password1!");

    expect(passwordInput).toHaveAttribute("type", "password");

    const showPasswordButton = screen.getByRole("button", { name: "Show password" });

    expect(showPasswordButton).toHaveAttribute("type", "button");

    await userEvent.click(showPasswordButton);

    expect(passwordInput).toHaveAttribute("type", "text");
    expect(passwordInput).toHaveValue("Password1!");
    expect(passwordInput).toHaveFocus();
    expect(screen.getByRole("button", { name: "Hide password" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Hide password" }));

    expect(passwordInput).toHaveAttribute("type", "password");
    expect(passwordInput).toHaveValue("Password1!");
    expect(passwordInput).toHaveFocus();
    expect(signinSpy).not.toHaveBeenCalled();
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

describe("RequestPasswordResetPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("is reachable from the signin page", () => {
    renderAuthRoutes(<Route path="/signin" element={<SigninPage />} />, "/signin");

    expect(screen.getByRole("link", { name: "Forgot password?" })).toHaveAttribute(
      "href",
      "/forgot-password"
    );
  });

  it("requests a reset link and shows generic success copy", async () => {
    vi.spyOn(api, "requestPasswordReset").mockResolvedValueOnce({
      message: "If an account exists for that email, a password reset link has been prepared.",
    });
    renderAuthRoutes(
      <>
        <Route path="/forgot-password" element={<RequestPasswordResetPage />} />
        <Route path="/signin" element={<SigninPage />} />
      </>,
      "/forgot-password"
    );

    await userEvent.type(screen.getByLabelText("Email"), "person@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Send reset link" }));

    expect(
      await screen.findByText(
        "If an account exists for that email, a password reset link has been prepared."
      )
    ).toBeInTheDocument();
    expect(api.requestPasswordReset).toHaveBeenCalledWith({ email: "person@example.com" });
    expect(screen.getByRole("link", { name: "Back to sign in" })).toHaveAttribute(
      "href",
      "/signin"
    );
  });

  it("shows request validation and fallback errors", async () => {
    vi.spyOn(api, "requestPasswordReset").mockRejectedValueOnce(new Error("offline"));
    renderAuthRoutes(
      <Route path="/forgot-password" element={<RequestPasswordResetPage />} />,
      "/forgot-password"
    );

    await userEvent.click(screen.getByRole("button", { name: "Send reset link" }));
    expect(await screen.findByText("Enter a valid email address.")).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Email"), "person@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Send reset link" }));

    expect(await screen.findByText("Unable to request a reset link.")).toBeInTheDocument();
  });
});

describe("ResetPasswordPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("resets the password with email and token query parameters", async () => {
    vi.spyOn(api, "confirmPasswordReset").mockResolvedValueOnce({
      message: "Password has been reset.",
    });
    renderAuthRoutes(
      <>
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/signin" element={<SigninPage />} />
      </>,
      "/reset-password?email=person%40example.com&token=reset-token-123"
    );

    await userEvent.type(screen.getByLabelText("New password"), "NewPassword1!");
    await userEvent.type(screen.getByLabelText("Confirm new password"), "NewPassword1!");
    await userEvent.click(screen.getByRole("button", { name: "Reset password" }));

    expect(await screen.findByText("Password has been reset.")).toBeInTheDocument();
    expect(api.confirmPasswordReset).toHaveBeenCalledWith({
      email: "person@example.com",
      token: "reset-token-123",
      newPassword: "NewPassword1!",
    });
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/signin");
  });

  it("reveals and hides both reset password fields without submitting", async () => {
    const confirmResetSpy = vi.spyOn(api, "confirmPasswordReset").mockResolvedValueOnce({
      message: "Password has been reset.",
    });
    renderAuthRoutes(
      <Route path="/reset-password" element={<ResetPasswordPage />} />,
      "/reset-password?email=person%40example.com&token=reset-token-123"
    );

    const newPasswordInput = screen.getByLabelText("New password");
    const confirmPasswordInput = screen.getByLabelText("Confirm new password");

    await userEvent.type(newPasswordInput, "NewPassword1!");
    await userEvent.type(confirmPasswordInput, "NewPassword1!");

    expect(newPasswordInput).toHaveAttribute("type", "password");
    expect(confirmPasswordInput).toHaveAttribute("type", "password");

    const showPasswordButton = screen.getByRole("button", { name: "Show password" });

    expect(showPasswordButton).toHaveAttribute("type", "button");

    await userEvent.click(showPasswordButton);

    expect(newPasswordInput).toHaveAttribute("type", "text");
    expect(confirmPasswordInput).toHaveAttribute("type", "text");
    expect(newPasswordInput).toHaveValue("NewPassword1!");
    expect(confirmPasswordInput).toHaveValue("NewPassword1!");
    expect(confirmPasswordInput).toHaveFocus();
    expect(screen.getByRole("button", { name: "Hide password" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Hide password" }));

    expect(newPasswordInput).toHaveAttribute("type", "password");
    expect(confirmPasswordInput).toHaveAttribute("type", "password");
    expect(newPasswordInput).toHaveValue("NewPassword1!");
    expect(confirmPasswordInput).toHaveValue("NewPassword1!");
    expect(confirmPasswordInput).toHaveFocus();
    expect(confirmResetSpy).not.toHaveBeenCalled();
  });

  it("submits the latest email and token after the reset link changes while mounted", async () => {
    vi.spyOn(api, "confirmPasswordReset").mockResolvedValueOnce({
      message: "Password has been reset.",
    });

    function ResetPasswordLinkSwitcher() {
      const navigate = useNavigate();

      return (
        <>
          <button
            type="button"
            onClick={() => {
              void navigate("/reset-password?email=second%40example.com&token=reset-token-456");
            }}
          >
            Load another reset link
          </button>
          <ResetPasswordPage />
        </>
      );
    }

    renderAuthRoutes(
      <>
        <Route path="/reset-password" element={<ResetPasswordLinkSwitcher />} />
        <Route path="/signin" element={<SigninPage />} />
      </>,
      "/reset-password?email=first%40example.com&token=reset-token-123"
    );

    await userEvent.click(screen.getByRole("button", { name: "Load another reset link" }));
    await userEvent.type(screen.getByLabelText("New password"), "NewPassword1!");
    await userEvent.type(screen.getByLabelText("Confirm new password"), "NewPassword1!");
    await userEvent.click(screen.getByRole("button", { name: "Reset password" }));

    expect(await screen.findByText("Password has been reset.")).toBeInTheDocument();
    expect(api.confirmPasswordReset).toHaveBeenCalledWith({
      email: "second@example.com",
      token: "reset-token-456",
      newPassword: "NewPassword1!",
    });
  });

  it("masks reset password fields after the reset link changes while mounted", async () => {
    function ResetPasswordLinkSwitcher() {
      const navigate = useNavigate();

      return (
        <>
          <button
            type="button"
            onClick={() => {
              void navigate("/reset-password?email=second%40example.com&token=reset-token-456");
            }}
          >
            Load another reset link
          </button>
          <ResetPasswordPage />
        </>
      );
    }

    renderAuthRoutes(
      <Route path="/reset-password" element={<ResetPasswordLinkSwitcher />} />,
      "/reset-password?email=first%40example.com&token=reset-token-123"
    );

    await userEvent.type(screen.getByLabelText("New password"), "NewPassword1!");
    await userEvent.type(screen.getByLabelText("Confirm new password"), "NewPassword1!");
    await userEvent.click(screen.getByRole("button", { name: "Show password" }));
    await userEvent.click(screen.getByRole("button", { name: "Load another reset link" }));

    expect(screen.getByLabelText("New password")).toHaveAttribute("type", "password");
    expect(screen.getByLabelText("Confirm new password")).toHaveAttribute("type", "password");
    expect(screen.getByLabelText("New password")).toHaveValue("");
    expect(screen.getByLabelText("Confirm new password")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Show password" })).toBeInTheDocument();
  });

  it("keeps the new reset-link state unchanged when an old confirm request settles", async () => {
    let resolveConfirmReset: ((response: { message: string }) => void) | undefined;
    const confirmResetPromise = new Promise<{ message: string }>((resolve) => {
      resolveConfirmReset = resolve;
    });
    vi.spyOn(api, "confirmPasswordReset").mockReturnValueOnce(confirmResetPromise);

    function ResetPasswordLinkSwitcher() {
      const navigate = useNavigate();

      return (
        <>
          <button
            type="button"
            onClick={() => {
              void navigate("/reset-password?email=second%40example.com&token=reset-token-456");
            }}
          >
            Load another reset link
          </button>
          <ResetPasswordPage />
        </>
      );
    }

    renderAuthRoutes(
      <Route path="/reset-password" element={<ResetPasswordLinkSwitcher />} />,
      "/reset-password?email=first%40example.com&token=reset-token-123"
    );

    await userEvent.type(screen.getByLabelText("New password"), "NewPassword1!");
    await userEvent.type(screen.getByLabelText("Confirm new password"), "NewPassword1!");
    await userEvent.click(screen.getByRole("button", { name: "Reset password" }));

    await waitFor(() => {
      expect(api.confirmPasswordReset).toHaveBeenCalledWith({
        email: "first@example.com",
        token: "reset-token-123",
        newPassword: "NewPassword1!",
      });
    });

    await userEvent.click(screen.getByRole("button", { name: "Load another reset link" }));

    expect(screen.getByRole("heading", { name: "Choose a new password" })).toBeInTheDocument();
    expect(screen.getByLabelText("New password")).toHaveValue("");
    expect(screen.getByLabelText("Confirm new password")).toHaveValue("");

    if (resolveConfirmReset === undefined) {
      throw new Error("Expected confirmPasswordReset resolver to be initialized.");
    }
    const resolveSettledConfirmReset = resolveConfirmReset;

    await act(async () => {
      resolveSettledConfirmReset({ message: "Password has been reset." });
      await confirmResetPromise;
    });

    expect(screen.getByRole("heading", { name: "Choose a new password" })).toBeInTheDocument();
    expect(screen.queryByText("Password has been reset.")).not.toBeInTheDocument();
    expect(screen.getByLabelText("New password")).toHaveValue("");
    expect(screen.getByLabelText("Confirm new password")).toHaveValue("");
  });

  it("shows recovery copy when the reset link is incomplete", () => {
    renderAuthRoutes(
      <>
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/forgot-password" element={<RequestPasswordResetPage />} />
      </>,
      "/reset-password?token=reset-token-123"
    );

    expect(screen.getByRole("heading", { name: "Reset link needs a refresh" })).toBeInTheDocument();
    expect(
      screen.getByText("This reset link is missing required reset details.")
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Request a new link" })).toHaveAttribute(
      "href",
      "/forgot-password"
    );
  });

  it("shows invalid-or-expired token recovery from API validation errors", async () => {
    vi.spyOn(api, "confirmPasswordReset").mockRejectedValueOnce(
      new ApiClientError("Password reset token is invalid or expired.", "validation", 400)
    );
    renderAuthRoutes(
      <Route path="/reset-password" element={<ResetPasswordPage />} />,
      "/reset-password?email=person%40example.com&token=expired-token"
    );

    await userEvent.type(screen.getByLabelText("New password"), "NewPassword1!");
    await userEvent.type(screen.getByLabelText("Confirm new password"), "NewPassword1!");
    await userEvent.click(screen.getByRole("button", { name: "Reset password" }));

    expect(
      await screen.findByText("This reset link is invalid or expired. Request a new reset link.")
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Request a new link" })).toHaveAttribute(
      "href",
      "/forgot-password"
    );
  });

  it("resets completion state and clears typed passwords when reset-link query params change", async () => {
    vi.spyOn(api, "confirmPasswordReset")
      .mockResolvedValueOnce({
        message: "Password has been reset.",
      })
      .mockRejectedValueOnce(
        new ApiClientError("Password reset token is invalid or expired.", "validation", 400)
      );

    function ResetPasswordResultSwitcher() {
      const navigate = useNavigate();

      return (
        <>
          <button
            type="button"
            onClick={() => {
              void navigate("/reset-password?email=next%40example.com&token=expired-token");
            }}
          >
            Load replacement reset link
          </button>
          <ResetPasswordPage />
        </>
      );
    }

    renderAuthRoutes(
      <>
        <Route path="/reset-password" element={<ResetPasswordResultSwitcher />} />
        <Route path="/signin" element={<SigninPage />} />
        <Route path="/forgot-password" element={<RequestPasswordResetPage />} />
      </>,
      "/reset-password?email=person%40example.com&token=reset-token-123"
    );

    await userEvent.type(screen.getByLabelText("New password"), "NewPassword1!");
    await userEvent.type(screen.getByLabelText("Confirm new password"), "NewPassword1!");
    await userEvent.click(screen.getByRole("button", { name: "Reset password" }));

    expect(await screen.findByText("Password has been reset.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Load replacement reset link" }));

    expect(
      await screen.findByRole("heading", { name: "Choose a new password" })
    ).toBeInTheDocument();
    expect(screen.queryByText("Password has been reset.")).not.toBeInTheDocument();
    expect(screen.getByLabelText("New password")).toHaveValue("");
    expect(screen.getByLabelText("Confirm new password")).toHaveValue("");

    await userEvent.type(screen.getByLabelText("New password"), "NewPassword1!");
    await userEvent.type(screen.getByLabelText("Confirm new password"), "NewPassword1!");
    await userEvent.click(screen.getByRole("button", { name: "Reset password" }));

    expect(
      await screen.findByText("This reset link is invalid or expired. Request a new reset link.")
    ).toBeInTheDocument();
  });

  it("shows reset-link recovery when the email query param is invalid", () => {
    renderAuthRoutes(
      <>
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/forgot-password" element={<RequestPasswordResetPage />} />
      </>,
      "/reset-password?email=not-an-email&token=reset-token-123"
    );

    expect(screen.getByRole("heading", { name: "Reset link needs a refresh" })).toBeInTheDocument();
    expect(
      screen.getByText("This reset link is missing required reset details.")
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Request a new link" })).toHaveAttribute(
      "href",
      "/forgot-password"
    );
    expect(
      screen.queryByRole("heading", { name: "Choose a new password" })
    ).not.toBeInTheDocument();
  });

  it("shows confirm validation and fallback errors", async () => {
    vi.spyOn(api, "confirmPasswordReset").mockRejectedValueOnce(new Error("offline"));
    renderAuthRoutes(
      <Route path="/reset-password" element={<ResetPasswordPage />} />,
      "/reset-password?email=person%40example.com&token=reset-token-123"
    );

    await userEvent.type(screen.getByLabelText("New password"), "NewPassword1!");
    await userEvent.type(screen.getByLabelText("Confirm new password"), "Different1!");
    await userEvent.click(screen.getByRole("button", { name: "Reset password" }));
    expect(await screen.findByText("Passwords must match.")).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText("Confirm new password"));
    await userEvent.type(screen.getByLabelText("Confirm new password"), "NewPassword1!");
    await userEvent.click(screen.getByRole("button", { name: "Reset password" }));

    expect(await screen.findByText("Unable to reset password.")).toBeInTheDocument();
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

    expect(screen.getByRole("status")).toHaveTextContent("We are checking this verification link.");
    expect(screen.getByRole("status")).not.toHaveAccessibleName("Verifying your email");
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

  it("uses a temporary failure title when verification cannot complete", async () => {
    vi.spyOn(api, "confirmEmailVerification").mockRejectedValueOnce(new Error("Network failure"));
    renderAuthRoutes(
      <Route path="/verify-email" element={<EmailVerificationPage />} />,
      "/verify-email?email=person%40example.com&token=token-123"
    );

    expect(await screen.findByRole("heading", { name: "Verification failed" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "We could not verify this link right now. Please try again or request a new link."
      )
    ).toBeInTheDocument();
  });

  it("updates the recovery email when the route email changes", async () => {
    vi.spyOn(api, "confirmEmailVerification")
      .mockRejectedValueOnce(
        new ApiClientError("Verification token is invalid or expired.", "validation", 400)
      )
      .mockRejectedValueOnce(
        new ApiClientError("Verification token is invalid or expired.", "validation", 400)
      );

    renderAuthRoutes(
      <Route
        path="/verify-email"
        element={
          <>
            <EmailVerificationPage />
            <Link to="/verify-email?email=second%40example.com&token=bad-token-2">
              Load second link
            </Link>
          </>
        }
      />,
      "/verify-email?email=first%40example.com&token=bad-token-1"
    );

    expect(await screen.findByLabelText("Email")).toHaveValue("first@example.com");

    await userEvent.click(screen.getByRole("link", { name: "Load second link" }));

    await waitFor(() => {
      expect(api.confirmEmailVerification).toHaveBeenCalledWith({
        email: "second@example.com",
        token: "bad-token-2",
      });
    });
    expect(screen.getByLabelText("Email")).toHaveValue("second@example.com");
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
    vi.spyOn(statusApi, "getBuildInfo").mockResolvedValueOnce(buildInfo);
    vi.spyOn(statusApi, "getHealthInfo").mockResolvedValueOnce(healthInfo);

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
    expect(screen.getByText("env test")).toBeInTheDocument();
    expect(screen.getByText("process")).toBeInTheDocument();
    expect(screen.getByText("up 2 minutes")).toBeInTheDocument();
  });

  it("renders the forgot-password route as a public page", async () => {
    vi.spyOn(statusApi, "getBuildInfo").mockRejectedValueOnce(new Error("status unavailable"));
    vi.spyOn(statusApi, "getHealthInfo").mockRejectedValueOnce(new Error("status unavailable"));

    render(
      <MemoryRouter initialEntries={["/forgot-password"]}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByRole("heading", { name: "Reset your password" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send reset link" })).toBeInTheDocument();
  });

  it("renders the reset-password route as a public page", async () => {
    vi.spyOn(statusApi, "getBuildInfo").mockRejectedValueOnce(new Error("status unavailable"));
    vi.spyOn(statusApi, "getHealthInfo").mockRejectedValueOnce(new Error("status unavailable"));

    render(
      <MemoryRouter
        initialEntries={["/reset-password?email=person%40example.com&token=reset-token-123"]}
      >
        <App />
      </MemoryRouter>
    );

    expect(
      await screen.findByRole("heading", { name: "Choose a new password" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reset password" })).toBeInTheDocument();
  });

  it("redirects to signin with a reauth message when protected activity rejects the session", async () => {
    vi.spyOn(api, "getCurrentUser").mockResolvedValueOnce(user);
    vi.spyOn(api, "getAccountActivity")
      .mockRejectedValueOnce(
        new ApiClientError("Invalid authentication token.", "unauthorized", 401)
      )
      .mockResolvedValueOnce({
        activities: [],
        limit: 20,
      });
    vi.spyOn(api, "signin").mockResolvedValueOnce({ accessToken: "new-token", user });
    vi.spyOn(statusApi, "getBuildInfo").mockRejectedValue(new Error("status unavailable"));
    vi.spyOn(statusApi, "getHealthInfo").mockRejectedValue(new Error("status unavailable"));
    setAccessToken("revoked-token");

    render(
      <MemoryRouter initialEntries={["/app"]}>
        <App />
      </MemoryRouter>
    );

    expect(
      await screen.findByRole("heading", { name: "Sign in with confidence" })
    ).toBeInTheDocument();
    expect(screen.getByText("Your session expired. Please sign in again.")).toBeInTheDocument();
    expect(localStorage.getItem("easygen.accessToken")).toBeNull();

    await userEvent.type(screen.getByLabelText("Email"), "person@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "Password1!");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(
      await screen.findByRole("heading", { name: "Welcome to the application." })
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Your session expired. Please sign in again.")
    ).not.toBeInTheDocument();
    expect(localStorage.getItem("easygen.accessToken")).toBe("new-token");
  });

  it("clears the reauth message after leaving signin", async () => {
    vi.spyOn(api, "getCurrentUser").mockRejectedValueOnce(
      new ApiClientError("Invalid authentication token.", "unauthorized", 401)
    );
    vi.spyOn(statusApi, "getBuildInfo").mockRejectedValueOnce(new Error("status unavailable"));
    vi.spyOn(statusApi, "getHealthInfo").mockRejectedValueOnce(new Error("status unavailable"));
    setAccessToken("revoked-token");

    render(
      <MemoryRouter initialEntries={["/app"]}>
        <App />
      </MemoryRouter>
    );

    expect(
      await screen.findByRole("heading", { name: "Sign in with confidence" })
    ).toBeInTheDocument();
    expect(screen.getByText("Your session expired. Please sign in again.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("link", { name: "Create one" }));
    expect(await screen.findByRole("heading", { name: "Create account" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("link", { name: "Sign in" }));
    expect(
      await screen.findByRole("heading", { name: "Sign in with confidence" })
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Your session expired. Please sign in again.")
    ).not.toBeInTheDocument();
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
    vi.spyOn(statusApi, "getHealthInfo").mockRejectedValueOnce(new Error("status unavailable"));
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
    vi.spyOn(statusApi, "getHealthInfo").mockRejectedValueOnce(new Error("status unavailable"));
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
    vi.spyOn(statusApi, "getBuildInfo").mockResolvedValueOnce(buildInfo);
    vi.spyOn(statusApi, "getHealthInfo").mockResolvedValueOnce(healthInfo);
    setAccessToken("token-123");

    render(
      <MemoryRouter initialEntries={["/app"]}>
        <App />
      </MemoryRouter>
    );

    expect(
      await screen.findByRole("heading", { name: "Welcome to the application." })
    ).toBeInTheDocument();
    const accountSummary = screen.getByRole("region", { name: "Account summary" });
    expect(accountSummary).toBeInTheDocument();
    expect(within(accountSummary).getByText("Person Name")).toBeInTheDocument();
    expect(within(accountSummary).getByText("person@example.com")).toBeInTheDocument();
    expect(within(accountSummary).getByText("user-1")).toBeInTheDocument();
    const accountSettings = screen.getByRole("region", { name: "Account settings" });
    expect(accountSettings).toBeInTheDocument();
    expect(within(accountSettings).getByLabelText("Name")).toHaveValue("Person Name");
    expect(await screen.findByRole("heading", { name: "Recent activity" })).toBeInTheDocument();
    expect(screen.getByText("Signed in")).toBeInTheDocument();
    expect(screen.queryByText("activity-1")).not.toBeInTheDocument();
    expect(screen.queryByText("auth.signed_in")).not.toBeInTheDocument();
    expect(await screen.findByRole("status", { name: "API connection" })).toHaveTextContent(
      "API connected"
    );
    const status = screen.getByRole("status", { name: "API connection" });
    expect(within(status).getByText("Process")).toBeInTheDocument();
    expect(within(status).queryByText("process")).not.toBeInTheDocument();
    expect(screen.getByText("2 minutes")).toBeInTheDocument();
    expect(api.getCurrentUser).toHaveBeenCalledWith("token-123");
    expect(api.getAccountActivity).toHaveBeenCalledWith("token-123");
    expect(statusApi.getBuildInfo).toHaveBeenCalledTimes(1);
    expect(statusApi.getHealthInfo).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("easygen.accessToken")).toBe("token-123");
  });

  it("updates the account summary after a profile settings save", async () => {
    vi.spyOn(api, "getCurrentUser").mockResolvedValueOnce(user);
    vi.spyOn(api, "getAccountActivity").mockResolvedValueOnce({
      activities: [],
      limit: 20,
    });
    vi.spyOn(api, "updateProfile").mockResolvedValueOnce({ ...user, name: "Updated Person" });
    vi.spyOn(statusApi, "getBuildInfo").mockRejectedValueOnce(new Error("status unavailable"));
    vi.spyOn(statusApi, "getHealthInfo").mockRejectedValueOnce(new Error("status unavailable"));
    setAccessToken("token-123");

    render(
      <MemoryRouter initialEntries={["/app"]}>
        <App />
      </MemoryRouter>
    );

    expect(
      await screen.findByRole("heading", { name: "Welcome to the application." })
    ).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText("Name"));
    await userEvent.type(screen.getByLabelText("Name"), "Updated Person");
    await userEvent.click(screen.getByRole("button", { name: "Save profile" }));

    expect(await screen.findByText("Profile updated.")).toBeInTheDocument();
    expect(api.updateProfile).toHaveBeenCalledWith("token-123", { name: "Updated Person" });
    expect(screen.getByText("Signed in as Updated Person.")).toBeInTheDocument();
    expect(
      within(screen.getByRole("region", { name: "Account summary" })).getByText("Updated Person")
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("region", { name: "Account settings" })).getByLabelText("Name")
    ).toHaveValue("Updated Person");
  });

  it("redirects settings profile stale-session responses to signin with a reauth message", async () => {
    vi.spyOn(api, "getCurrentUser").mockResolvedValueOnce(user);
    vi.spyOn(api, "getAccountActivity").mockResolvedValueOnce({
      activities: [],
      limit: 20,
    });
    vi.spyOn(api, "updateProfile").mockRejectedValueOnce(
      new ApiClientError("Invalid authentication session.", "unauthorized", 401)
    );
    vi.spyOn(statusApi, "getBuildInfo").mockRejectedValueOnce(new Error("status unavailable"));
    vi.spyOn(statusApi, "getHealthInfo").mockRejectedValueOnce(new Error("status unavailable"));
    setAccessToken("token-123");

    render(
      <MemoryRouter initialEntries={["/app"]}>
        <App />
      </MemoryRouter>
    );

    expect(
      await screen.findByRole("heading", { name: "Welcome to the application." })
    ).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText("Name"));
    await userEvent.type(screen.getByLabelText("Name"), "Updated Person");
    await userEvent.click(screen.getByRole("button", { name: "Save profile" }));

    expect(
      await screen.findByRole("heading", { name: "Sign in with confidence" })
    ).toBeInTheDocument();
    expect(screen.getByText("Your session expired. Please sign in again.")).toBeInTheDocument();
    expect(localStorage.getItem("easygen.accessToken")).toBeNull();
  });

  it("keeps the settings stale-session message visible under StrictMode", async () => {
    vi.spyOn(api, "getCurrentUser").mockResolvedValue(user);
    vi.spyOn(api, "getAccountActivity").mockResolvedValue({
      activities: [],
      limit: 20,
    });
    vi.spyOn(api, "updateProfile").mockRejectedValueOnce(
      new ApiClientError("Invalid authentication session.", "unauthorized", 401)
    );
    vi.spyOn(statusApi, "getBuildInfo").mockRejectedValue(new Error("status unavailable"));
    vi.spyOn(statusApi, "getHealthInfo").mockRejectedValue(new Error("status unavailable"));
    setAccessToken("token-123");

    render(
      <StrictMode>
        <MemoryRouter initialEntries={["/app"]}>
          <App />
        </MemoryRouter>
      </StrictMode>
    );

    expect(
      await screen.findByRole("heading", { name: "Welcome to the application." })
    ).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText("Name"));
    await userEvent.type(screen.getByLabelText("Name"), "Updated Person");
    await userEvent.click(screen.getByRole("button", { name: "Save profile" }));

    expect(
      await screen.findByRole("heading", { name: "Sign in with confidence" })
    ).toBeInTheDocument();
    expect(screen.getByText("Your session expired. Please sign in again.")).toBeInTheDocument();
    expect(localStorage.getItem("easygen.accessToken")).toBeNull();
  });

  it("keeps the application usable when the in-page status request fails", async () => {
    vi.spyOn(api, "getCurrentUser").mockResolvedValueOnce(user);
    vi.spyOn(api, "getAccountActivity").mockResolvedValueOnce({
      activities: [],
      limit: 20,
    });
    vi.spyOn(statusApi, "getBuildInfo").mockRejectedValueOnce(new Error("status unavailable"));
    vi.spyOn(statusApi, "getHealthInfo").mockRejectedValueOnce(new Error("status unavailable"));
    setAccessToken("token-123");

    render(
      <MemoryRouter initialEntries={["/app"]}>
        <App />
      </MemoryRouter>
    );

    expect(
      await screen.findByRole("heading", { name: "Welcome to the application." })
    ).toBeInTheDocument();
    const accountSummary = screen.getByRole("region", { name: "Account summary" });
    expect(accountSummary).toBeInTheDocument();
    expect(within(accountSummary).getByText("Person Name")).toBeInTheDocument();
    expect(within(accountSummary).getByText("person@example.com")).toBeInTheDocument();
    expect(within(accountSummary).getByText("user-1")).toBeInTheDocument();
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
    vi.spyOn(statusApi, "getHealthInfo").mockRejectedValueOnce(new Error("status unavailable"));
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
    expect(
      within(screen.getByRole("region", { name: "Account summary" })).getByText(
        "person@example.com"
      )
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("status", { name: "Account activity unavailable" })
    ).toHaveTextContent("Recent account activity is unavailable.");
    expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument();
  });

  it("renders the email verification route as a public page", async () => {
    vi.spyOn(statusApi, "getBuildInfo").mockRejectedValueOnce(new Error("status unavailable"));
    vi.spyOn(statusApi, "getHealthInfo").mockRejectedValueOnce(new Error("status unavailable"));
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
    vi.spyOn(statusApi, "getHealthInfo").mockRejectedValueOnce(new Error("status unavailable"));
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
    vi.spyOn(statusApi, "getHealthInfo").mockRejectedValueOnce(new Error("status unavailable"));
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

    expect(
      await screen.findByRole("status", { name: "API build and liveness information" })
    ).toHaveTextContent("API status unavailable");

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
    vi.spyOn(statusApi, "getHealthInfo").mockRejectedValueOnce(new Error("status unavailable"));
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

    expect(
      await screen.findByRole("status", { name: "API build and liveness information" })
    ).toHaveTextContent("API status unavailable");

    await userEvent.type(screen.getByLabelText("Email"), "person@example.com");
    await userEvent.type(screen.getByLabelText("Name"), "Person Name");
    await userEvent.type(screen.getByLabelText("Password"), "Password1!");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(
      await screen.findByRole("heading", { name: "Welcome to the application." })
    ).toBeInTheDocument();
    expect(localStorage.getItem("easygen.accessToken")).toBe("token-123");
  });

  it("renders the requested pathname without query or fragment on unknown routes", async () => {
    vi.spyOn(statusApi, "getBuildInfo").mockRejectedValueOnce(new Error("status unavailable"));
    vi.spyOn(statusApi, "getHealthInfo").mockRejectedValueOnce(new Error("status unavailable"));

    render(
      <MemoryRouter initialEntries={["/missing-route/deep-link?utm=1#details"]}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByRole("heading", { name: "Page not found" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "HTTP status 404" })).toBeVisible();
    expect(screen.getByText("This route does not exist.")).toBeInTheDocument();

    const requestedPath = screen.getByRole("region", { name: "Requested path" });
    expect(requestedPath).toHaveTextContent("/missing-route/deep-link");
    expect(requestedPath).not.toHaveTextContent("utm=1");
    expect(requestedPath).not.toHaveTextContent("details");

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
