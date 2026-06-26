import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { isApiClientError } from "../api/client";
import { changePassword, updateProfile, type PublicUser } from "../auth/api";
import {
  PASSWORD_HELPER_MESSAGE,
  accountDeletionSchema,
  passwordChangeSchema,
  profileUpdateSchema,
  type AccountDeletionFormValues,
  type PasswordChangeFormValues,
  type ProfileUpdateFormValues,
} from "../auth/validation";
import { authStyles } from "../pages/authStyles";

interface AccountSettingsPanelProps {
  accessToken: string | null;
  user: PublicUser | null;
  onUserUpdated: (user: PublicUser) => void;
  onAccountDeleted: (currentPassword: string) => Promise<void>;
}

export function AccountSettingsPanel({
  accessToken,
  user,
  onUserUpdated,
  onAccountDeleted,
}: AccountSettingsPanelProps) {
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileFailed, setProfileFailed] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordFailed, setPasswordFailed] = useState(false);
  const [deletionOpen, setDeletionOpen] = useState(false);
  const [deletionMessage, setDeletionMessage] = useState<string | null>(null);
  const [deletionFailed, setDeletionFailed] = useState(false);
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
  const {
    register: registerDeletion,
    handleSubmit: handleDeletionSubmit,
    reset: resetDeletion,
    formState: { errors: deletionErrors, isSubmitting: isDeletionSubmitting },
  } = useForm<AccountDeletionFormValues>({
    resolver: zodResolver(accountDeletionSchema),
    defaultValues: { currentPassword: "", confirmDeletion: false },
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
      setPasswordMessage("Password changed.");
    } catch (error) {
      setPasswordFailed(true);
      setPasswordMessage(isApiClientError(error) ? error.message : "Unable to change password.");
    }
  }

  function closeDeletionForm() {
    setDeletionOpen(false);
    setDeletionMessage(null);
    setDeletionFailed(false);
    resetDeletion({ currentPassword: "", confirmDeletion: false });
  }

  async function onDeletionSubmit(values: AccountDeletionFormValues) {
    setDeletionMessage(null);
    setDeletionFailed(false);

    try {
      await onAccountDeleted(values.currentPassword);
    } catch (error) {
      setDeletionFailed(true);
      setDeletionMessage(isApiClientError(error) ? error.message : "Unable to delete account.");
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

      <section
        className="grid gap-4 border-t border-line pt-5"
        aria-labelledby="delete-account-title"
      >
        <div>
          <h3
            id="delete-account-title"
            className="m-0 text-lg font-semibold leading-tight text-ink"
          >
            Delete account
          </h3>
          <p className="mt-1 text-sm leading-5 text-muted">
            This permanently removes your account and signs you out.
          </p>
        </div>

        {deletionOpen ? (
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              void handleDeletionSubmit(onDeletionSubmit)(event);
            }}
            noValidate
          >
            <div className={authStyles.field}>
              <label className={authStyles.label} htmlFor="settings-delete-current-password">
                Current password for account deletion
              </label>
              <input
                id="settings-delete-current-password"
                className={authStyles.input}
                type="password"
                autoComplete="current-password"
                aria-describedby="settings-delete-current-password-message"
                aria-invalid={deletionErrors.currentPassword ? "true" : "false"}
                {...registerDeletion("currentPassword")}
              />
              <p
                id="settings-delete-current-password-message"
                className={`${deletionErrors.currentPassword ? authStyles.error : authStyles.helper} ${authStyles.messageSlot}`}
                aria-live="polite"
              >
                {deletionErrors.currentPassword?.message ?? "Enter your current password."}
              </p>
            </div>

            <label className="flex items-start gap-3 text-sm font-semibold leading-5 text-label">
              <input
                className="mt-1 h-4 w-4 accent-danger"
                type="checkbox"
                aria-describedby="settings-delete-confirmation-message"
                aria-invalid={deletionErrors.confirmDeletion ? "true" : "false"}
                {...registerDeletion("confirmDeletion")}
              />
              <span>I understand this permanently deletes my account.</span>
            </label>
            <p
              id="settings-delete-confirmation-message"
              className={`${deletionErrors.confirmDeletion ? authStyles.error : authStyles.helper} ${authStyles.messageSlot}`}
              aria-live="polite"
            >
              {deletionErrors.confirmDeletion?.message ?? ""}
            </p>

            <p
              className={`${deletionFailed ? authStyles.error : authStyles.helper} ${authStyles.messageSlot}`}
              aria-live="polite"
            >
              {deletionMessage ?? ""}
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                className={authStyles.dangerButton}
                type="submit"
                disabled={isDeletionSubmitting}
              >
                {isDeletionSubmitting ? "Deleting..." : "Delete account"}
              </button>
              <button
                className={authStyles.secondaryButton}
                type="button"
                onClick={closeDeletionForm}
                disabled={isDeletionSubmitting}
              >
                Cancel account deletion
              </button>
            </div>
          </form>
        ) : (
          <button
            className={authStyles.dangerButton}
            type="button"
            onClick={() => {
              setDeletionOpen(true);
              setDeletionMessage(null);
              setDeletionFailed(false);
            }}
          >
            Delete account...
          </button>
        )}
      </section>
    </section>
  );
}
