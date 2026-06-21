import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";

import { isApiClientError } from "../api/client";
import { useAuth } from "../auth/AuthProvider";
import { signupSchema, type SignupFormValues } from "../auth/validation";
import { authStyles } from "./authStyles";

export function SignupPage() {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: "", name: "", password: "" },
  });

  async function onSubmit(values: SignupFormValues) {
    setSubmitError(null);
    try {
      await signup(values);
      void navigate("/app", { replace: true });
    } catch (error) {
      setSubmitError(isApiClientError(error) ? error.message : "Unable to create account.");
    }
  }

  return (
    <section className={authStyles.card} aria-labelledby="signup-title">
      <p className={authStyles.kicker}>easyGen</p>
      <h1 id="signup-title" className={authStyles.title}>
        Create account
      </h1>
      <form
        className={authStyles.form}
        onSubmit={(event) => {
          void handleSubmit(onSubmit)(event);
        }}
        noValidate
      >
        <div className={authStyles.field}>
          <label className={authStyles.label} htmlFor="signup-email">
            Email
          </label>
          <input
            id="signup-email"
            className={authStyles.input}
            type="email"
            inputMode="email"
            autoComplete="email"
            aria-describedby="signup-email-error"
            aria-invalid={errors.email ? "true" : "false"}
            spellCheck={false}
            {...register("email")}
          />
          <p
            id="signup-email-error"
            className={`${errors.email ? authStyles.error : authStyles.helper} ${authStyles.messageSlot}`}
            aria-live="polite"
          >
            {errors.email?.message ?? "Use the email you want to sign in with."}
          </p>
        </div>

        <div className={authStyles.field}>
          <label className={authStyles.label} htmlFor="signup-name">
            Name
          </label>
          <input
            id="signup-name"
            className={authStyles.input}
            type="text"
            autoComplete="name"
            aria-describedby="signup-name-error"
            aria-invalid={errors.name ? "true" : "false"}
            spellCheck={false}
            {...register("name")}
          />
          <p
            id="signup-name-error"
            className={`${errors.name ? authStyles.error : authStyles.helper} ${authStyles.messageSlot}`}
            aria-live="polite"
          >
            {errors.name?.message ?? "Enter at least 3 characters."}
          </p>
        </div>

        <div className={authStyles.field}>
          <label className={authStyles.label} htmlFor="signup-password">
            Password
          </label>
          <input
            id="signup-password"
            className={authStyles.input}
            type="password"
            autoComplete="new-password"
            aria-describedby="signup-password-error"
            aria-invalid={errors.password ? "true" : "false"}
            {...register("password")}
          />
          <p
            id="signup-password-error"
            className={`${errors.password ? authStyles.error : authStyles.helper} ${authStyles.messageSlotTall}`}
            aria-live="polite"
          >
            {errors.password?.message ?? "Use 8+ characters with a letter, number, and symbol."}
          </p>
        </div>

        <p
          className={`${submitError ? authStyles.error : authStyles.helper} ${authStyles.messageSlot}`}
          aria-live="polite"
        >
          {submitError ?? ""}
        </p>

        <button className={authStyles.button} type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create account"}
        </button>
      </form>
      <p className={authStyles.switchText}>
        Already have an account? <Link to="/signin">Sign in</Link>
      </p>
    </section>
  );
}
