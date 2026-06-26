import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { isApiClientError } from "../api/client";
import { changePassword, updateProfile, type PublicUser } from "../auth/api";
import {
  PASSWORD_HELPER_MESSAGE,
  passwordChangeSchema,
  profileUpdateSchema,
  type PasswordChangeFormValues,
  type ProfileUpdateFormValues,
} from "../auth/validation";
import { authStyles } from "../pages/authStyles";

const INVALID_CURRENT_PASSWORD_MESSAGE = "Invalid current password.";

interface AccountSettingsPanelProps {
  accessToken: string | null;
  user: PublicUser | null;
  onUnauthorized: () => void;
  onUserUpdated: (user: PublicUser) => void;
}

export function AccountSettingsPanel({
  accessToken,
  user,
  onUnauthorized,
  onUserUpdated,
}: AccountSettingsPanelProps) {
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileFailed, setProfileFailed] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordFailed, setPasswordFailed] = useState(false);
  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    reset: resetProfile,
    formState: { errors: profileErrors, isSubmitting: isProfileSubmitting },
  } = useForm<ProfileUpdateFormValues>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: { name: user?.name ?? "" },
  });
  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPassword,
    formState: { errors: passwordErrors, isSubmitting: isPasswordSubmitting },
  } = useForm<PasswordChangeFormValues>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmNewPassword: "" },
  });

  useEffect(() => {
    resetProfile({ name: user?.name ?? "" });
  }, [resetProfile, user?.name]);

  if (accessToken === null || user === null) {
    return null;
  }

  async function onProfileSubmit(values: ProfileUpdateFormValues) {
    if (accessToken === null) {
      return;
    }

    setProfileMessage(null);
    setProfileFailed(false);

    try {
      const updatedUser = await updateProfile(accessToken, values);
      onUserUpdated(updatedUser);
      resetProfile({ name: updatedUser.name });
      setProfileMessage("Profile updated.");
    } catch (error) {
      if (shouldRouteSettingsErrorToReauth(error)) {
        onUnauthorized();
        return;
      }

      setProfileFailed(true);
      setProfileMessage(isApiClientError(error) ? error.message : "Unable to update profile.");
    }
  }

  async function onPasswordSubmit(values: PasswordChangeFormValues) {
    if (accessToken === null) {
      return;
    }

    setPasswordMessage(null);
    setPasswordFailed(false);

    try {
      await changePassword(accessToken, {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      resetPassword();
      setPasswordMessage(
        "Password changed. You can keep using this tab; other sessions may need to sign in again."
      );
    } catch (error) {
      if (shouldRouteSettingsErrorToReauth(error)) {
        onUnauthorized();
        return;
      }

      setPasswordFailed(true);
      setPasswordMessage(isApiClientError(error) ? error.message : "Unable to change password.");
    }
  }

  return (
    <section className="grid gap-5" aria-labelledby="account-settings-title">
      <div>
        <h2
          id="account-settings-title"
          className="m-0 text-xl font-semibold leading-tight text-ink"
        >
          Account settings
        </h2>
        <p className="mt-1 text-sm leading-5 text-muted">
          <span className="font-bold text-label">Account email</span>{" "}
          <span aria-label="Account email">{user.email}</span>
        </p>
      </div>

      <form
        className="grid gap-4"
        onSubmit={(event) => {
          void handleProfileSubmit(onProfileSubmit)(event);
        }}
        noValidate
      >
        <div className={authStyles.field}>
          <label className={authStyles.label} htmlFor="settings-name">
            Name
          </label>
          <input
            id="settings-name"
            className={authStyles.input}
            type="text"
            autoComplete="name"
            aria-describedby="settings-name-message"
            aria-invalid={profileErrors.name ? "true" : "false"}
            spellCheck={false}
            {...registerProfile("name")}
          />
          <p
            id="settings-name-message"
            className={`${profileErrors.name ? authStyles.error : authStyles.helper} ${authStyles.messageSlot}`}
            aria-live="polite"
          >
            {profileErrors.name?.message ?? "Enter at least 3 characters."}
          </p>
        </div>

        <p
          className={`${profileFailed ? authStyles.error : authStyles.helper} ${authStyles.messageSlot}`}
          aria-live="polite"
        >
          {profileMessage ?? ""}
        </p>

        <button className={authStyles.button} type="submit" disabled={isProfileSubmitting}>
          {isProfileSubmitting ? "Saving..." : "Save profile"}
        </button>
      </form>

      <form
        className="grid gap-4 border-t border-line pt-5"
        onSubmit={(event) => {
          void handlePasswordSubmit(onPasswordSubmit)(event);
        }}
        noValidate
      >
        <div className={authStyles.field}>
          <label className={authStyles.label} htmlFor="settings-current-password">
            Current password
          </label>
          <input
            id="settings-current-password"
            className={authStyles.input}
            type="password"
            autoComplete="current-password"
            aria-describedby="settings-current-password-message"
            aria-invalid={passwordErrors.currentPassword ? "true" : "false"}
            {...registerPassword("currentPassword")}
          />
          <p
            id="settings-current-password-message"
            className={`${passwordErrors.currentPassword ? authStyles.error : authStyles.helper} ${authStyles.messageSlot}`}
            aria-live="polite"
          >
            {passwordErrors.currentPassword?.message ?? "Enter your current password."}
          </p>
        </div>

        <div className={authStyles.field}>
          <label className={authStyles.label} htmlFor="settings-new-password">
            New password
          </label>
          <input
            id="settings-new-password"
            className={authStyles.input}
            type="password"
            autoComplete="new-password"
            aria-describedby="settings-new-password-message"
            aria-invalid={passwordErrors.newPassword ? "true" : "false"}
            {...registerPassword("newPassword")}
          />
          <p
            id="settings-new-password-message"
            className={`${passwordErrors.newPassword ? authStyles.error : authStyles.helper} ${authStyles.messageSlotTall}`}
            aria-live="polite"
          >
            {passwordErrors.newPassword?.message ?? PASSWORD_HELPER_MESSAGE}
          </p>
        </div>

        <div className={authStyles.field}>
          <label className={authStyles.label} htmlFor="settings-confirm-new-password">
            Confirm new password
          </label>
          <input
            id="settings-confirm-new-password"
            className={authStyles.input}
            type="password"
            autoComplete="new-password"
            aria-describedby="settings-confirm-new-password-message"
            aria-invalid={passwordErrors.confirmNewPassword ? "true" : "false"}
            {...registerPassword("confirmNewPassword")}
          />
          <p
            id="settings-confirm-new-password-message"
            className={`${passwordErrors.confirmNewPassword ? authStyles.error : authStyles.helper} ${authStyles.messageSlot}`}
            aria-live="polite"
          >
            {passwordErrors.confirmNewPassword?.message ?? "Repeat the new password."}
          </p>
        </div>

        <p
          className={`${passwordFailed ? authStyles.error : authStyles.helper} ${authStyles.messageSlot}`}
          aria-live="polite"
        >
          {passwordMessage ?? ""}
        </p>

        <button className={authStyles.button} type="submit" disabled={isPasswordSubmitting}>
          {isPasswordSubmitting ? "Changing..." : "Change password"}
        </button>
      </form>
    </section>
  );
}

function shouldRouteSettingsErrorToReauth(error: unknown): boolean {
  return (
    isApiClientError(error) &&
    error.category === "unauthorized" &&
    error.message !== INVALID_CURRENT_PASSWORD_MESSAGE
  );
}
