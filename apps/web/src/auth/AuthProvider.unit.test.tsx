import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiClientError } from "../api/client";
import { AuthProvider, useAuth } from "./AuthProvider";
import * as api from "./api";
import { setAccessToken } from "./session";

const user = {
  id: "user-1",
  email: "person@example.com",
  name: "Person Name",
  emailVerified: true,
};

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

  it("clears invalid stored token after getCurrentUser rejects with unauthorized", async () => {
    setAccessToken("bad-token");
    vi.spyOn(api, "getCurrentUser").mockRejectedValueOnce(
      new ApiClientError("Invalid authentication token.", "unauthorized", 401)
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

  it("sets a reauth message when a stored token is rejected as unauthorized", async () => {
    setAccessToken("revoked-token");
    vi.spyOn(api, "getCurrentUser").mockRejectedValueOnce(
      new ApiClientError("Invalid authentication token.", "unauthorized", 401)
    );

    render(
      <AuthProvider>
        <ReauthMessageProbe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Your session expired. Please sign in again.")).toBeInTheDocument();
    });
    expect(localStorage.getItem("easygen.accessToken")).toBeNull();
  });

  it("clears the reauth message after a successful signin", async () => {
    setAccessToken("revoked-token");
    vi.spyOn(api, "getCurrentUser").mockRejectedValueOnce(
      new ApiClientError("Invalid authentication token.", "unauthorized", 401)
    );
    vi.spyOn(api, "signin").mockResolvedValueOnce({ accessToken: "token-123", user });

    render(
      <AuthProvider>
        <SigninButton />
        <ReauthMessageProbe />
      </AuthProvider>
    );

    expect(
      await screen.findByText("Your session expired. Please sign in again.")
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(screen.getByText("no-message")).toBeInTheDocument();
    });
    expect(localStorage.getItem("easygen.accessToken")).toBe("token-123");
  });

  it("keeps stored token when getCurrentUser rejects with unavailable while rendering guest after loading", async () => {
    setAccessToken("token-123");
    vi.spyOn(api, "getCurrentUser").mockRejectedValueOnce(
      new ApiClientError("Unable to reach the API. Please try again.", "unavailable")
    );

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("guest")).toBeInTheDocument();
    });
    expect(localStorage.getItem("easygen.accessToken")).toBe("token-123");
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

    await waitFor(() => {
      expect(localStorage.getItem("easygen.accessToken")).toBe("token-123");
    });
    expect(await screen.findByText("Person Name")).toBeInTheDocument();
  });

  it("surfaces the current access token through auth context", async () => {
    vi.spyOn(api, "signin").mockResolvedValueOnce({ accessToken: "token-123", user });

    render(
      <AuthProvider>
        <TokenProbe />
        <SigninButton />
      </AuthProvider>
    );

    expect(await screen.findByText("token:none")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("token:token-123")).toBeInTheDocument();
  });

  it("revokes the stored token before clearing logout state", async () => {
    setAccessToken("token-123");
    vi.spyOn(api, "getCurrentUser").mockResolvedValueOnce(user);
    const logout = vi.spyOn(api, "logout").mockResolvedValueOnce(undefined);

    render(
      <AuthProvider>
        <LogoutButton />
        <Probe />
      </AuthProvider>
    );

    await screen.findByText("Person Name");
    await userEvent.click(screen.getByRole("button", { name: "Log out" }));

    await waitFor(() => {
      expect(logout).toHaveBeenCalledWith("token-123");
    });
    expect(localStorage.getItem("easygen.accessToken")).toBeNull();
    expect(screen.getByText("guest")).toBeInTheDocument();
  });

  it("deletes the account before clearing authenticated state", async () => {
    setAccessToken("token-123");
    vi.spyOn(api, "getCurrentUser").mockResolvedValueOnce(user);
    const deleteAccount = vi.spyOn(api, "deleteAccount").mockResolvedValueOnce(undefined);

    render(
      <AuthProvider>
        <DeleteAccountButton />
        <Probe />
      </AuthProvider>
    );

    await screen.findByText("Person Name");
    await userEvent.click(screen.getByRole("button", { name: "Delete account" }));

    await waitFor(() => {
      expect(deleteAccount).toHaveBeenCalledWith("token-123", {
        currentPassword: "Password1!",
      });
    });
    expect(localStorage.getItem("easygen.accessToken")).toBeNull();
    expect(screen.getByText("guest")).toBeInTheDocument();
  });

  it("does not let a stale bootstrap request replace a new signin session", async () => {
    const staleUser = {
      id: "user-old",
      email: "old@example.com",
      name: "Old Session",
      emailVerified: true,
    };
    const newUser = {
      id: "user-new",
      email: "new@example.com",
      name: "New Session",
      emailVerified: true,
    };
    let resolveBootstrap!: (value: typeof staleUser) => void;
    const bootstrap = new Promise<typeof staleUser>((resolve) => {
      resolveBootstrap = resolve;
    });

    setAccessToken("old-token");
    vi.spyOn(api, "getCurrentUser").mockReturnValueOnce(bootstrap);
    vi.spyOn(api, "signin").mockResolvedValueOnce({ accessToken: "new-token", user: newUser });

    render(
      <AuthProvider>
        <SigninButton />
        <AuthStateProbe />
      </AuthProvider>
    );

    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(localStorage.getItem("easygen.accessToken")).toBe("new-token");
    });

    resolveBootstrap(staleUser);

    await waitFor(() => {
      expect(screen.getByText("ready")).toBeInTheDocument();
    });
    expect(screen.getByTestId("auth-user")).toHaveTextContent("New Session");
  });

  it("does not let a stale user replacement restore user state after logout", async () => {
    setAccessToken("token-123");
    vi.spyOn(api, "getCurrentUser").mockResolvedValueOnce(user);
    vi.spyOn(api, "logout").mockResolvedValueOnce(undefined);

    render(
      <AuthProvider>
        <StaleReplaceHarness />
      </AuthProvider>
    );

    await screen.findByText("Person Name");
    await userEvent.click(screen.getByRole("button", { name: "Capture replacement" }));
    await userEvent.click(screen.getByRole("button", { name: "Log out" }));

    expect(await screen.findByText("guest")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Apply stale user" }));

    expect(screen.getByText("guest")).toBeInTheDocument();
    expect(screen.queryByText("Stale Session")).not.toBeInTheDocument();
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

function LogoutButton() {
  const { logout } = useAuth();

  return (
    <button
      type="button"
      onClick={() => {
        void logout();
      }}
    >
      Log out
    </button>
  );
}

function DeleteAccountButton() {
  const { deleteAccount } = useAuth();

  return (
    <button
      type="button"
      onClick={() => {
        void deleteAccount("Password1!");
      }}
    >
      Delete account
    </button>
  );
}

function AuthStateProbe() {
  const { isLoading, user } = useAuth();

  return (
    <>
      <p>{isLoading ? "loading" : "ready"}</p>
      <p data-testid="auth-user">{user?.name ?? "guest"}</p>
    </>
  );
}

function TokenProbe() {
  const { accessToken } = useAuth();

  return <p>token:{accessToken ?? "none"}</p>;
}

function StaleReplaceHarness() {
  const { logout, replaceUser } = useAuth();
  const [capturedReplaceUser, setCapturedReplaceUser] = useState<
    ReturnType<typeof useAuth>["replaceUser"] | null
  >(null);

  return (
    <>
      <Probe />
      <button
        type="button"
        onClick={() => {
          setCapturedReplaceUser(() => replaceUser);
        }}
      >
        Capture replacement
      </button>
      <button
        type="button"
        onClick={() => {
          void logout();
        }}
      >
        Log out
      </button>
      <button
        type="button"
        onClick={() => {
          capturedReplaceUser?.({
            id: "user-stale",
            email: "stale@example.com",
            name: "Stale Session",
            emailVerified: true,
          });
        }}
      >
        Apply stale user
      </button>
    </>
  );
}

function ReauthMessageProbe() {
  const { reauthMessage } = useAuth();

  return <p>{reauthMessage ?? "no-message"}</p>;
}
