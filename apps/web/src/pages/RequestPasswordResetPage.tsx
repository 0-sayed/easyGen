import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";

import { isApiClientError } from "../api/client";
import { requestPasswordReset } from "../auth/api";
import {
  passwordResetRequestSchema,
  type PasswordResetRequestFormValues,
} from "../auth/validation";
import { authStyles } from "./authStyles";

export function RequestPasswordResetPage() {
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PasswordResetRequestFormValues>({
    resolver: zodResolver(passwordResetRequestSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: PasswordResetRequestFormValues) {
    setSubmitMessage(null);
    setIsError(false);

    try {
      const response = await requestPasswordReset(values);
      setSubmitMessage(response.message);
    } catch (error) {
      setIsError(true);
      setSubmitMessage(isApiClientError(error) ? error.message : "Unable to request a reset link.");
    }
  }

  return (
    <section className={authStyles.card} aria-labelledby="reset-request-title">
      <p className={authStyles.kicker}>easyGen</p>
      <h1 id="reset-request-title" className={authStyles.title}>
        Reset your password
      </h1>
      <form
        className={authStyles.form}
        onSubmit={(event) => {
          void handleSubmit(onSubmit)(event);
        }}
        noValidate
      >
        <div className={authStyles.field}>
          <label className={authStyles.label} htmlFor="reset-request-email">
            Email
          </label>
          <input
            id="reset-request-email"
            className={authStyles.input}
            type="email"
            inputMode="email"
            autoComplete="email"
            aria-describedby="reset-request-email-error"
            aria-invalid={errors.email ? "true" : "false"}
            spellCheck={false}
            {...register("email")}
          />
          <p
            id="reset-request-email-error"
            className={`${errors.email ? authStyles.error : authStyles.helper} ${authStyles.messageSlot}`}
            aria-live="polite"
          >
            {errors.email?.message ?? "Enter your account email."}
          </p>
        </div>

        <p
          className={`${isError ? authStyles.error : authStyles.helper} ${authStyles.messageSlotTall}`}
          aria-live="polite"
        >
          {submitMessage ?? "We will send reset instructions when the account can receive them."}
        </p>

        <button className={authStyles.button} type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Sending..." : "Send reset link"}
        </button>
      </form>
      <p className={authStyles.switchText}>
        <Link to="/signin">Back to sign in</Link>
      </p>
    </section>
  );
}
