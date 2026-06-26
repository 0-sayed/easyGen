import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiClientError } from "../api/client";
import * as api from "../auth/api";
import { AccountSettingsPanel } from "./AccountSettingsPanel";

const user = {
  id: "user-1",
  email: "person@example.com",
  name: "Person Name",
  emailVerified: true,
};

describe("AccountSettingsPanel", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders current account settings", () => {
    render(
      <AccountSettingsPanel
        accessToken="token-123"
        user={user}
        onUnauthorized={vi.fn()}
        onUserUpdated={vi.fn()}
        onAccountDeleted={vi.fn()}
      />
    );

    expect(screen.getByRole("heading", { name: "Account settings" })).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("Person Name");
    expect(screen.getByLabelText("Account email")).toHaveTextContent("person@example.com");
  });

  it("validates profile and password fields before submitting", async () => {
    render(
      <AccountSettingsPanel
        accessToken="token-123"
        user={user}
        onUnauthorized={vi.fn()}
        onUserUpdated={vi.fn()}
        onAccountDeleted={vi.fn()}
      />
    );

    await userEvent.clear(screen.getByLabelText("Name"));
    await userEvent.type(screen.getByLabelText("Name"), "Al");
    await userEvent.click(screen.getByRole("button", { name: "Save profile" }));
    await userEvent.click(screen.getByRole("button", { name: "Change password" }));

    expect(await screen.findByText("Name must be at least 3 characters.")).toBeInTheDocument();
    expect(screen.getByText("Current password is required.")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Password must be at least 8 characters and include a letter, a number, and a special character."
      )
    ).toBeInTheDocument();
  });

  it("updates the profile and reports the returned user", async () => {
    const updatedUser = { ...user, name: "Updated Person" };
    const onUserUpdated = vi.fn();
    vi.spyOn(api, "updateProfile").mockResolvedValueOnce(updatedUser);

    render(
      <AccountSettingsPanel
        accessToken="token-123"
        user={user}
        onUnauthorized={vi.fn()}
        onUserUpdated={onUserUpdated}
        onAccountDeleted={vi.fn()}
      />
    );

    await userEvent.clear(screen.getByLabelText("Name"));
    await userEvent.type(screen.getByLabelText("Name"), "Updated Person");
    await userEvent.click(screen.getByRole("button", { name: "Save profile" }));

    expect(await screen.findByText("Profile updated.")).toBeInTheDocument();
    expect(api.updateProfile).toHaveBeenCalledWith("token-123", { name: "Updated Person" });
    expect(onUserUpdated).toHaveBeenCalledWith(updatedUser);
    expect(screen.getByLabelText("Name")).toHaveValue("Updated Person");
  });

  it("shows profile API errors", async () => {
    vi.spyOn(api, "updateProfile").mockRejectedValueOnce(
      new ApiClientError("Profile update input failed validation.", "validation", 400)
    );

    render(
      <AccountSettingsPanel
        accessToken="token-123"
        user={user}
        onUnauthorized={vi.fn()}
        onUserUpdated={vi.fn()}
        onAccountDeleted={vi.fn()}
      />
    );

    await userEvent.clear(screen.getByLabelText("Name"));
    await userEvent.type(screen.getByLabelText("Name"), "Updated Person");
    await userEvent.click(screen.getByRole("button", { name: "Save profile" }));

    expect(await screen.findByText("Profile update input failed validation.")).toBeInTheDocument();
  });

  it("routes unauthorized profile saves through the reauth handler", async () => {
    const onUnauthorized = vi.fn();
    vi.spyOn(api, "updateProfile").mockRejectedValueOnce(
      new ApiClientError("Invalid authentication session.", "unauthorized", 401)
    );

    render(
      <AccountSettingsPanel
        accessToken="token-123"
        user={user}
        onUnauthorized={onUnauthorized}
        onUserUpdated={vi.fn()}
        onAccountDeleted={vi.fn()}
      />
    );

    await userEvent.clear(screen.getByLabelText("Name"));
    await userEvent.type(screen.getByLabelText("Name"), "Updated Person");
    await userEvent.click(screen.getByRole("button", { name: "Save profile" }));

    await waitFor(() => {
      expect(onUnauthorized).toHaveBeenCalledTimes(1);
    });
    expect(screen.queryByText("Invalid authentication session.")).not.toBeInTheDocument();
  });

  it("changes the password and clears password fields", async () => {
    vi.spyOn(api, "changePassword").mockResolvedValueOnce(undefined);

    render(
      <AccountSettingsPanel
        accessToken="token-123"
        user={user}
        onUnauthorized={vi.fn()}
        onUserUpdated={vi.fn()}
        onAccountDeleted={vi.fn()}
      />
    );

    await userEvent.type(screen.getByLabelText("Current password"), "Password1!");
    await userEvent.type(screen.getByLabelText("New password"), "NewPassword1!");
    await userEvent.type(screen.getByLabelText("Confirm new password"), "NewPassword1!");
    await userEvent.click(screen.getByRole("button", { name: "Change password" }));

    expect(
      await screen.findByText(
        "Password changed. You can keep using this tab; other sessions may need to sign in again."
      )
    ).toBeInTheDocument();
    expect(api.changePassword).toHaveBeenCalledWith("token-123", {
      currentPassword: "Password1!",
      newPassword: "NewPassword1!",
    });
    await waitFor(() => {
      expect(screen.getByLabelText("Current password")).toHaveValue("");
      expect(screen.getByLabelText("New password")).toHaveValue("");
      expect(screen.getByLabelText("Confirm new password")).toHaveValue("");
    });
  });

  it("shows password API errors", async () => {
    vi.spyOn(api, "changePassword").mockRejectedValueOnce(
      new ApiClientError("Current password is incorrect.", "validation", 400)
    );

    const onUnauthorized = vi.fn();
    render(
      <AccountSettingsPanel
        accessToken="token-123"
        user={user}
        onUnauthorized={onUnauthorized}
        onUserUpdated={vi.fn()}
        onAccountDeleted={vi.fn()}
      />
    );

    await userEvent.type(screen.getByLabelText("Current password"), "WrongPassword1!");
    await userEvent.type(screen.getByLabelText("New password"), "NewPassword1!");
    await userEvent.type(screen.getByLabelText("Confirm new password"), "NewPassword1!");
    await userEvent.click(screen.getByRole("button", { name: "Change password" }));

    expect(await screen.findByText("Current password is incorrect.")).toBeInTheDocument();
    expect(onUnauthorized).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Current password")).toHaveValue("WrongPassword1!");
    expect(screen.getByLabelText("New password")).toHaveValue("NewPassword1!");
    expect(screen.getByLabelText("Confirm new password")).toHaveValue("NewPassword1!");
  });

  it("routes revoked password changes through the reauth handler", async () => {
    const onUnauthorized = vi.fn();
    vi.spyOn(api, "changePassword").mockRejectedValueOnce(
      new ApiClientError("Invalid authentication token.", "unauthorized", 401)
    );

    render(
      <AccountSettingsPanel
        accessToken="token-123"
        user={user}
        onUnauthorized={onUnauthorized}
        onUserUpdated={vi.fn()}
        onAccountDeleted={vi.fn()}
      />
    );

    await userEvent.type(screen.getByLabelText("Current password"), "Password1!");
    await userEvent.type(screen.getByLabelText("New password"), "NewPassword1!");
    await userEvent.type(screen.getByLabelText("Confirm new password"), "NewPassword1!");
    await userEvent.click(screen.getByRole("button", { name: "Change password" }));

    await waitFor(() => {
      expect(onUnauthorized).toHaveBeenCalledTimes(1);
    });
    expect(screen.queryByText("Invalid authentication token.")).not.toBeInTheDocument();
  });

  it("reveals and cancels account deletion without calling the API", async () => {
    const onAccountDeleted = vi.fn();

    render(
      <AccountSettingsPanel
        accessToken="token-123"
        user={user}
        onUnauthorized={vi.fn()}
        onUserUpdated={vi.fn()}
        onAccountDeleted={onAccountDeleted}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: "Delete account..." }));
    await userEvent.type(
      screen.getByLabelText("Current password for account deletion"),
      "Password1!"
    );
    await userEvent.click(
      screen.getByLabelText("I understand this permanently deletes my account.")
    );
    await userEvent.click(screen.getByRole("button", { name: "Cancel account deletion" }));

    expect(onAccountDeleted).not.toHaveBeenCalled();
    expect(
      screen.queryByLabelText("Current password for account deletion")
    ).not.toBeInTheDocument();
  });

  it("requires password and explicit confirmation before deleting the account", async () => {
    const onAccountDeleted = vi.fn();

    render(
      <AccountSettingsPanel
        accessToken="token-123"
        user={user}
        onUnauthorized={vi.fn()}
        onUserUpdated={vi.fn()}
        onAccountDeleted={onAccountDeleted}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: "Delete account..." }));
    await userEvent.click(screen.getByRole("button", { name: "Delete account" }));

    expect(await screen.findByText("Current password is required.")).toBeInTheDocument();
    expect(screen.getByText("Confirm account deletion before continuing.")).toBeInTheDocument();
    expect(
      screen.getByLabelText("I understand this permanently deletes my account.")
    ).toHaveAttribute("aria-invalid", "true");
    expect(onAccountDeleted).not.toHaveBeenCalled();
  });

  it("submits account deletion and leaves routing to the parent", async () => {
    const onAccountDeleted = vi.fn().mockResolvedValueOnce(undefined);

    render(
      <AccountSettingsPanel
        accessToken="token-123"
        user={user}
        onUnauthorized={vi.fn()}
        onUserUpdated={vi.fn()}
        onAccountDeleted={onAccountDeleted}
      />
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
      expect(onAccountDeleted).toHaveBeenCalledWith("Password1!");
    });
    expect(screen.getByLabelText("Current password for account deletion")).toHaveValue(
      "Password1!"
    );
    expect(
      screen.getByLabelText("I understand this permanently deletes my account.")
    ).toBeChecked();
  });

  it("shows account deletion API errors and keeps the form usable", async () => {
    const onAccountDeleted = vi
      .fn()
      .mockRejectedValueOnce(new ApiClientError("Invalid current password.", "unauthorized", 401));

    render(
      <AccountSettingsPanel
        accessToken="token-123"
        user={user}
        onUnauthorized={vi.fn()}
        onUserUpdated={vi.fn()}
        onAccountDeleted={onAccountDeleted}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: "Delete account..." }));
    await userEvent.type(
      screen.getByLabelText("Current password for account deletion"),
      "WrongPassword1!"
    );
    await userEvent.click(
      screen.getByLabelText("I understand this permanently deletes my account.")
    );
    await userEvent.click(screen.getByRole("button", { name: "Delete account" }));

    expect(await screen.findByText("Invalid current password.")).toBeInTheDocument();
    expect(screen.getByLabelText("Current password for account deletion")).toHaveValue(
      "WrongPassword1!"
    );
    expect(screen.getByRole("button", { name: "Delete account" })).toBeEnabled();
  });
});
