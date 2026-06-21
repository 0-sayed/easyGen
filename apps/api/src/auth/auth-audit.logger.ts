import { Injectable } from "@nestjs/common";
import { createHash } from "node:crypto";
import { PinoLogger } from "nestjs-pino";

type AuthAuditEvent =
  | "auth.signup.success"
  | "auth.signup.failure"
  | "auth.signin.success"
  | "auth.signin.failure"
  | "auth.throttle.blocked"
  | "auth.token.failure"
  | "auth.user_lookup.failure";

type AuthAuditFailureReason =
  | "duplicate_signup"
  | "invalid_credentials"
  | "invalid_token"
  | "missing_token"
  | "malformed_token"
  | "signup_rejected"
  | "throttled"
  | "user_not_found";

interface AuthAuditContext {
  correlationId?: string;
  email?: string;
  ip?: string;
  userAgent?: string;
}

interface AuthAuditPayload {
  audit: true;
  event: AuthAuditEvent;
  correlationId?: string;
  emailHash?: string;
  ip?: string;
  reason?: AuthAuditFailureReason;
  userAgent?: string;
  userId?: string;
}

interface AuthAuditSuccessInput extends AuthAuditContext {
  userId: string;
}

interface AuthAuditFailureInput extends AuthAuditContext {
  reason: AuthAuditFailureReason;
}

interface AuthAuditLogInput {
  correlationId?: string;
  email?: string;
  ip?: string;
  reason?: AuthAuditFailureReason;
  userAgent?: string;
  userId?: string;
}

interface AuthAuditSink {
  info(payload: AuthAuditPayload, message: string): void;
}

@Injectable()
export class AuthAuditLogger {
  constructor(private readonly logger: PinoLogger) {}

  logSignupSuccess(input: AuthAuditSuccessInput): void {
    this.log("auth.signup.success", input);
  }

  logSignupFailure(input: AuthAuditFailureInput): void {
    this.log("auth.signup.failure", input);
  }

  logSigninSuccess(input: AuthAuditSuccessInput): void {
    this.log("auth.signin.success", input);
  }

  logSigninFailure(input: AuthAuditFailureInput): void {
    this.log("auth.signin.failure", input);
  }

  logThrottleBlocked(input: AuthAuditContext): void {
    this.log("auth.throttle.blocked", { ...input, reason: "throttled" });
  }

  logTokenFailure(input: Omit<AuthAuditFailureInput, "email">): void {
    this.log("auth.token.failure", input);
  }

  logUserLookupFailure(input: Omit<AuthAuditContext, "email"> & { userId?: string }): void {
    this.log("auth.user_lookup.failure", {
      correlationId: input.correlationId,
      ip: input.ip,
      reason: "user_not_found",
      userAgent: input.userAgent,
      userId: input.userId,
    });
  }

  private log(event: AuthAuditEvent, input: AuthAuditLogInput): void {
    const payload: AuthAuditPayload = {
      audit: true,
      event,
    };

    if (input.correlationId !== undefined) {
      payload.correlationId = input.correlationId;
    }
    if (input.email !== undefined) {
      payload.emailHash = hashEmail(input.email);
    }
    if (input.ip !== undefined) {
      payload.ip = input.ip;
    }
    if (input.reason !== undefined) {
      payload.reason = input.reason;
    }
    if (input.userAgent !== undefined) {
      payload.userAgent = input.userAgent;
    }
    if (input.userId !== undefined) {
      payload.userId = input.userId;
    }

    this.getAuditSink().info(payload, "auth audit event");
  }

  private getAuditSink(): AuthAuditSink {
    const rootLogger = Reflect.get(PinoLogger, "root");
    return isAuthAuditSink(rootLogger) ? rootLogger : this.logger;
  }
}

function hashEmail(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

function isAuthAuditSink(value: unknown): value is AuthAuditSink {
  return (
    typeof value === "object" &&
    value !== null &&
    "info" in value &&
    typeof value.info === "function"
  );
}
