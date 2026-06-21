import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { isApiClientError } from "../api/client";
import { useAuth } from "../auth/AuthProvider";
import { signinSchema, type SigninFormValues } from "../auth/validation";
import { authStyles } from "./authStyles";

export function SigninPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signin } = useAuth();
  const [inputsLocked, setInputsLocked] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SigninFormValues>({
    resolver: zodResolver(signinSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: SigninFormValues) {
    setSubmitError(null);
    try {
      await signin(values);
      void navigate(getRedirectPath(location.state), { replace: true });
    } catch (error) {
      setSubmitError(isApiClientError(error) ? error.message : "Unable to sign in.");
    }
  }

  function unlockInputs() {
    setInputsLocked(false);
  }

  return (
    <section className={authStyles.card} aria-labelledby="signin-title">
      <p className={authStyles.kicker}>easyGen</p>
      <h1 id="signin-title" className={authStyles.title}>
        Sign in with confidence
      </h1>
      <form
        className={authStyles.form}
        autoComplete="off"
        onSubmit={(event) => {
          void handleSubmit(onSubmit)(event);
        }}
        noValidate
      >
        <div className={authStyles.field}>
          <label className={authStyles.label} htmlFor="signin-email">
            Email
          </label>
          <input
            id="signin-email"
            className={authStyles.input}
            type="email"
            inputMode="email"
            autoComplete="off"
            aria-describedby="signin-email-error"
            aria-invalid={errors.email ? "true" : "false"}
            onFocus={unlockInputs}
            onPointerDown={unlockInputs}
            readOnly={inputsLocked}
            spellCheck={false}
            {...register("email")}
          />
          <p
            id="signin-email-error"
            className={`${errors.email ? authStyles.error : authStyles.helper} ${authStyles.messageSlot}`}
            aria-live="polite"
          >
            {errors.email?.message ?? "Enter your account email."}
          </p>
        </div>

        <div className={authStyles.field}>
          <label className={authStyles.label} htmlFor="signin-password">
            Password
          </label>
          <input
            id="signin-password"
            className={authStyles.input}
            type="password"
            autoComplete="off"
            aria-describedby="signin-password-error"
            aria-invalid={errors.password ? "true" : "false"}
            onFocus={unlockInputs}
            onPointerDown={unlockInputs}
            readOnly={inputsLocked}
            {...register("password")}
          />
          <p
            id="signin-password-error"
            className={`${errors.password ? authStyles.error : authStyles.helper} ${authStyles.messageSlot}`}
            aria-live="polite"
          >
            {errors.password?.message ?? "Enter your password."}
          </p>
        </div>

        <p
          className={`${submitError ? authStyles.error : authStyles.helper} ${authStyles.messageSlot}`}
          aria-live="polite"
        >
          {submitError ?? "Your session stays on this device."}
        </p>

        <button className={authStyles.button} type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
      <p className={authStyles.switchText}>
        Need an account? <Link to="/signup">Create one</Link>
      </p>
    </section>
  );
}

function getRedirectPath(state: unknown): string {
  if (typeof state !== "object" || state === null || !("from" in state)) {
    return "/app";
  }

  const { from } = state;
  if (typeof from !== "object" || from === null || !("pathname" in from)) {
    return "/app";
  }

  return typeof from.pathname === "string" &&
    from.pathname.startsWith("/") &&
    !from.pathname.startsWith("//")
    ? from.pathname
    : "/app";
}
