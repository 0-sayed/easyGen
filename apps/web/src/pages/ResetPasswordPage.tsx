import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useSearchParams } from "react-router-dom";

import { isApiClientError } from "../api/client";
import { confirmPasswordReset } from "../auth/api";
import {
  passwordResetConfirmSchema,
  passwordResetRequestSchema,
  type PasswordResetConfirmFormValues,
} from "../auth/validation";
import { authStyles } from "./authStyles";

const INVALID_OR_EXPIRED_TOKEN_MESSAGE = "Password reset token is invalid or expired.";
const INVALID_OR_EXPIRED_RECOVERY_MESSAGE =
  "This reset link is invalid or expired. Request a new reset link.";

type ResetLinkIdentity = {
  email: string;
  token: string;
};

function isSameResetLinkIdentity(left: ResetLinkIdentity, right: ResetLinkIdentity) {
  return left.email === right.email && left.token === right.token;
}

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const token = searchParams.get("token") ?? "";
  const hasValidResetLink =
    email.length > 0 &&
    token.length > 0 &&
    passwordResetRequestSchema.safeParse({ email }).success;
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const currentResetLinkIdentityRef = useRef<ResetLinkIdentity>({ email, token });
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordResetConfirmFormValues>({
    resolver: zodResolver(passwordResetConfirmSchema),
    defaultValues: {
      email,
      token,
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    currentResetLinkIdentityRef.current = { email, token };
    reset({
      email,
      token,
      newPassword: "",
      confirmPassword: "",
    });
    setSubmitMessage(null);
    setIsError(false);
    setIsComplete(false);
  }, [email, reset, token]);

  if (!hasValidResetLink) {
    return (
      <section className={authStyles.card} aria-labelledby="reset-link-refresh-title">
        <p className={authStyles.kicker}>easyGen</p>
        <h1 id="reset-link-refresh-title" className={authStyles.title}>
          Reset link needs a refresh
        </h1>
        <p className={authStyles.statusText}>
          This reset link is missing required reset details.
        </p>
        <p className={authStyles.switchText}>
          <Link to="/forgot-password">Request a new link</Link>
        </p>
      </section>
    );
  }

  if (isComplete) {
    return (
      <section className={authStyles.card} aria-labelledby="reset-complete-title">
        <p className={authStyles.kicker}>easyGen</p>
        <h1 id="reset-complete-title" className={authStyles.title}>
          Password updated
        </h1>
        <p className={authStyles.statusText}>{submitMessage}</p>
        <p className={authStyles.switchText}>
          <Link to="/signin">Sign in</Link>
        </p>
      </section>
    );
  }

  async function onSubmit(values: PasswordResetConfirmFormValues) {
    const submittedResetLinkIdentity = {
      email: values.email,
      token: values.token,
    };
    setSubmitMessage(null);
    setIsError(false);

    try {
      const response = await confirmPasswordReset({
        email: values.email,
        token: values.token,
        newPassword: values.newPassword,
      });
      if (
        !isSameResetLinkIdentity(
          currentResetLinkIdentityRef.current,
          submittedResetLinkIdentity
        )
      ) {
        return;
      }

      setSubmitMessage(response.message);
      setIsComplete(true);
    } catch (error) {
      if (
        !isSameResetLinkIdentity(
          currentResetLinkIdentityRef.current,
          submittedResetLinkIdentity
        )
      ) {
        return;
      }

      setIsError(true);
      if (isApiClientError(error) && error.message === INVALID_OR_EXPIRED_TOKEN_MESSAGE) {
        setSubmitMessage(INVALID_OR_EXPIRED_RECOVERY_MESSAGE);
        return;
      }

      setSubmitMessage(isApiClientError(error) ? error.message : "Unable to reset password.");
    }
  }

  return (
    <section className={authStyles.card} aria-labelledby="reset-password-title">
      <p className={authStyles.kicker}>easyGen</p>
      <h1 id="reset-password-title" className={authStyles.title}>
        Choose a new password
      </h1>
      <form
        className={authStyles.form}
        onSubmit={(event) => {
          void handleSubmit(onSubmit)(event);
        }}
        noValidate
      >
        <input type="hidden" {...register("email")} />
        <input type="hidden" {...register("token")} />

        <div className={authStyles.field}>
          <label className={authStyles.label} htmlFor="reset-new-password">
            New password
          </label>
          <input
            id="reset-new-password"
            className={authStyles.input}
            type="password"
            autoComplete="new-password"
            aria-describedby="reset-new-password-error"
            aria-invalid={errors.newPassword ? "true" : "false"}
            {...register("newPassword")}
          />
          <p
            id="reset-new-password-error"
            className={`${errors.newPassword ? authStyles.error : authStyles.helper} ${authStyles.messageSlotTall}`}
            aria-live="polite"
          >
            {errors.newPassword?.message ??
              "Use 8+ characters with a letter, number, and symbol."}
          </p>
        </div>

        <div className={authStyles.field}>
          <label className={authStyles.label} htmlFor="reset-confirm-password">
            Confirm new password
          </label>
          <input
            id="reset-confirm-password"
            className={authStyles.input}
            type="password"
            autoComplete="new-password"
            aria-describedby="reset-confirm-password-error"
            aria-invalid={errors.confirmPassword ? "true" : "false"}
            {...register("confirmPassword")}
          />
          <p
            id="reset-confirm-password-error"
            className={`${errors.confirmPassword ? authStyles.error : authStyles.helper} ${authStyles.messageSlot}`}
            aria-live="polite"
          >
            {errors.confirmPassword?.message ?? "Re-enter the new password."}
          </p>
        </div>

        <p
          className={`${isError ? authStyles.error : authStyles.helper} ${authStyles.messageSlotTall}`}
          aria-live="polite"
        >
          {submitMessage ?? "This will replace your current password."}
        </p>

        {isError && submitMessage === INVALID_OR_EXPIRED_RECOVERY_MESSAGE ? (
          <p className={authStyles.switchText}>
            <Link to="/forgot-password">Request a new link</Link>
          </p>
        ) : null}

        <button className={authStyles.button} type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Resetting..." : "Reset password"}
        </button>
      </form>
    </section>
  );
}
