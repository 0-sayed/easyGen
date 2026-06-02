import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AuthProvider, useAuth } from "./AuthProvider";
import * as api from "./api";
import { setAccessToken } from "./session";

const user = { id: "user-1", email: "person@example.com", name: "Person Name" };

describe("AuthProvider", () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("bootstraps the current user when a token exists", async () => {
    setAccessToken("token-123");
    vi.spyOn(api, "getCurrentUser").mockResolvedValueOnce(user);

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    expect(screen.getByText("loading")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("Person Name")).toBeInTheDocument();
    });
  });

  it("clears an invalid stored token", async () => {
    setAccessToken("bad-token");
    vi.spyOn(api, "getCurrentUser").mockRejectedValueOnce(
      new Error("Invalid authentication token.")
    );

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("guest")).toBeInTheDocument();
    });
    expect(localStorage.getItem("easygen.accessToken")).toBeNull();
  });

  it("signs in and stores the access token", async () => {
    vi.spyOn(api, "signin").mockResolvedValueOnce({ accessToken: "token-123", user });

    render(
      <AuthProvider>
        <SigninButton />
        <Probe />
      </AuthProvider>
    );

    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(localStorage.getItem("easygen.accessToken")).toBe("token-123");
    expect(screen.getByText("Person Name")).toBeInTheDocument();
  });
});

function Probe() {
  const { isLoading, user } = useAuth();

  if (isLoading) {
    return <p>loading</p>;
  }

  return <p>{user?.name ?? "guest"}</p>;
}

function SigninButton() {
  const { signin } = useAuth();

  return (
    <button
      type="button"
      onClick={() => {
        void signin({ email: "person@example.com", password: "Password1!" });
      }}
    >
      Sign in
    </button>
  );
}
