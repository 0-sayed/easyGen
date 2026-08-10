import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useNavigationType } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import * as authProvider from "../auth/AuthProvider";
import { ApplicationPage } from "./ApplicationPage";

vi.mock("../account-activity/AccountActivityPanel", () => ({
  AccountActivityPanel: () => <section aria-label="Account activity" />,
}));

vi.mock("../status/ApplicationStatusPanel", () => ({
  ApplicationStatusPanel: () => <section aria-label="Application status" />,
}));

const user = {
  id: "user-1",
  email: "person@example.com",
  name: "Person Name",
  emailVerified: true,
};

function SigninRoute() {
  const navigationType = useNavigationType();

  return <p>{`${navigationType} signin-route`}</p>;
}

describe("ApplicationPage", () => {
  it("renders the signed-in application heading with the product name", () => {
    vi.spyOn(authProvider, "useAuth").mockReturnValue({
      accessToken: "token-123",
      isLoading: false,
      reauthMessage: null,
      user,
      clearReauthMessage: vi.fn(),
      deleteAccount: vi.fn(),
      handleRevokedSession: vi.fn(),
      signin: vi.fn(),
      signup: vi.fn(),
      logout: vi.fn(),
      replaceUser: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/app"]}>
        <ApplicationPage />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "Welcome to easyGen" })).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Welcome to the application." })
    ).not.toBeInTheDocument();
    const accountSummary = screen.getByRole("region", { name: "Account summary" });
    expect(within(accountSummary).getByText("Account email")).toBeInTheDocument();
    expect(within(accountSummary).getByText("person@example.com")).toBeInTheDocument();
  });

  it("navigates to signin with route replacement after account deletion succeeds", async () => {
    const deleteAccount = vi.fn().mockResolvedValueOnce(undefined);

    vi.spyOn(authProvider, "useAuth").mockReturnValue({
      accessToken: "token-123",
      isLoading: false,
      reauthMessage: null,
      user,
      clearReauthMessage: vi.fn(),
      deleteAccount,
      handleRevokedSession: vi.fn(),
      signin: vi.fn(),
      signup: vi.fn(),
      logout: vi.fn(),
      replaceUser: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/app"]}>
        <Routes>
          <Route path="/signin" element={<SigninRoute />} />
          <Route path="/app" element={<ApplicationPage />} />
        </Routes>
      </MemoryRouter>
    );

    await userEvent.click(screen.getByRole("button", { name: "Delete account..." }));
    await userEvent.type(
      screen.getByLabelText("Current password for account deletion"),
      "Password1!"
    );
    await userEvent.click(
      screen.getByLabelText("I understand this permanently deletes my account.")
    );
    await userEvent.click(screen.getByRole("button", { name: "Delete account" }));

    await waitFor(() => {
      expect(deleteAccount).toHaveBeenCalledWith("Password1!");
    });
    expect(await screen.findByText("REPLACE signin-route")).toBeInTheDocument();
  });
});
