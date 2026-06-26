import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useSearchParams } from "react-router-dom";

import { isApiClientError } from "../api/client";
import { confirmEmailVerification, requestEmailVerification } from "../auth/api";
import {
  emailVerificationRequestSchema,
  type EmailVerificationRequestFormValues,
} from "../auth/validation";
import { authStyles } from "./authStyles";

type VerificationStatus = "loading" | "success" | "failure";

const INVALID_OR_EXPIRED_MESSAGE =
  "This verification link is invalid or expired. Request a new verification email to continue.";
const TEMPORARY_FAILURE_MESSAGE =
  "We could not verify this link right now. Please try again or request a new link.";
const THROTTLED_MESSAGE = "Too many verification attempts. Please wait and try the link again.";
const sharedConfirmationRequests = new Map<string, ReturnType<typeof confirmEmailVerification>>();

function getSharedConfirmationRequest(email: string, token: string) {
  const requestKey = `${email}::${token}`;
  const existingRequest = sharedConfirmationRequests.get(requestKey);

  if (existingRequest) {
    return existingRequest;
  }

  const request = confirmEmailVerification({ email, token }).finally(() => {
    sharedConfirmationRequests.delete(requestKey);
  });
  sharedConfirmationRequests.set(requestKey, request);
  return request;
}

export function EmailVerificationPage() {
  const [searchParams] = useSearchParams();
  const email = useMemo(() => searchParams.get("email")?.trim() ?? "", [searchParams]);
  const token = useMemo(() => searchParams.get("token")?.trim() ?? "", [searchParams]);
  const hasRequiredParams = email.length > 0 && token.length > 0;
  const [status, setStatus] = useState<VerificationStatus>(
    hasRequiredParams ? "loading" : "failure"
  );
  const [statusMessage, setStatusMessage] = useState(
    hasRequiredParams ? "We are checking this verification link." : INVALID_OR_EXPIRED_MESSAGE
  );
  const [requestMessage, setRequestMessage] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EmailVerificationRequestFormValues>({
    resolver: zodResolver(emailVerificationRequestSchema),
    defaultValues: { email },
  });

  useEffect(() => {
    reset({ email });
  }, [email, reset]);

  useEffect(() => {
    if (!hasRequiredParams) {
      setStatus("failure");
      setStatusMessage(INVALID_OR_EXPIRED_MESSAGE);
      return;
    }

    let active = true;
    setStatus("loading");
    setStatusMessage("We are checking this verification link.");

    void getSharedConfirmationRequest(email, token)
      .then((response) => {
        if (!active) {
          return;
        }

        setStatus("success");
        setStatusMessage(response.user.email);
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }

        setStatus("failure");
        if (isApiClientError(error) && error.category === "throttled") {
          setStatusMessage(THROTTLED_MESSAGE);
          return;
        }

        setStatusMessage(
          isApiClientError(error) && error.category === "validation"
            ? INVALID_OR_EXPIRED_MESSAGE
            : TEMPORARY_FAILURE_MESSAGE
        );
      });

    return () => {
      active = false;
    };
  }, [email, hasRequiredParams, token]);

  async function onRequestVerification(values: EmailVerificationRequestFormValues) {
    setRequestMessage(null);
    setRequestError(null);

    try {
      const response = await requestEmailVerification(values);
      setRequestMessage(response.message);
    } catch (error) {
      setRequestError(
        isApiClientError(error) ? error.message : "Unable to request a new verification email."
      );
    }
  }

  return (
    <section className={authStyles.card} aria-labelledby="email-verification-title">
      <p className={authStyles.kicker}>easyGen</p>
      <h1 id="email-verification-title" className={authStyles.title}>
        {status === "success"
          ? "Email verified"
          : status === "loading"
            ? "Verifying your email"
            : statusMessage === TEMPORARY_FAILURE_MESSAGE
              ? "Verification failed"
              : "Verification link invalid or expired"}
      </h1>

      {status === "loading" ? (
        <p className={`${authStyles.statusText} mt-4`} role="status">
          {statusMessage}
        </p>
      ) : null}

      {status === "success" ? (
        <>
          <p className={`${authStyles.statusText} mt-4`}>Your email address has been verified.</p>
          <p className={authStyles.userName}>{statusMessage}</p>
          <div className={`${authStyles.actions} mt-6`}>
            <Link className={authStyles.primaryLink} to="/signin">
              Sign in
            </Link>
            <Link className={authStyles.secondaryLink} to="/app">
              Open app
            </Link>
          </div>
        </>
      ) : null}

      {status === "failure" ? (
        <>
          <p className={`${authStyles.statusText} mt-4`}>{statusMessage}</p>
          <form
            className={authStyles.form}
            onSubmit={(event) => {
              void handleSubmit(onRequestVerification)(event);
            }}
            noValidate
          >
            <div className={authStyles.field}>
              <label className={authStyles.label} htmlFor="verification-email">
                Email
              </label>
              <input
                id="verification-email"
                className={authStyles.input}
                type="email"
                inputMode="email"
                autoComplete="email"
                aria-describedby="verification-email-error"
                aria-invalid={errors.email ? "true" : "false"}
                spellCheck={false}
                {...register("email")}
              />
              <p
                id="verification-email-error"
                className={`${errors.email ? authStyles.error : authStyles.helper} ${authStyles.messageSlot}`}
                aria-live="polite"
              >
                {errors.email?.message ?? "Request a new verification email."}
              </p>
            </div>

            <p
              className={`${requestError ? authStyles.error : authStyles.helper} ${authStyles.messageSlotTall}`}
              aria-live="polite"
            >
              {requestError ?? requestMessage ?? ""}
            </p>

            <button className={authStyles.button} type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Requesting..." : "Request verification email"}
            </button>
          </form>
          <p className={authStyles.switchText}>
            Already verified? <Link to="/signin">Sign in</Link>
          </p>
        </>
      ) : null}
    </section>
  );
}
