import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { App } from "../App";
import { AuthProvider } from "../auth/AuthProvider";
import * as api from "../auth/api";
import { SigninPage } from "./SigninPage";
import { SignupPage } from "./SignupPage";

const user = { id: "user-1", email: "person@example.com", name: "Person Name" };

describe("SignupPage", () => {
  afterEach(() => {
    localStorage.clear();
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
    vi.spyOn(api, "signup").mockRejectedValueOnce(new Error("Email is already registered."));
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
});

describe("App routes", () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("redirects unauthenticated users from /app to /signin", async () => {
    render(
      <MemoryRouter initialEntries={["/app"]}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
  });

  it("renders the protected welcome page and logs out", async () => {
    vi.spyOn(api, "getCurrentUser").mockResolvedValueOnce(user);
    localStorage.setItem("easygen.accessToken", "token-123");

    render(
      <MemoryRouter initialEntries={["/app"]}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByText("Welcome to the application.")).toBeInTheDocument();
    expect(screen.getByText("Person Name")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Log out" }));

    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    expect(localStorage.getItem("easygen.accessToken")).toBeNull();
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
