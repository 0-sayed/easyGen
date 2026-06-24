import { PinoLogger } from "nestjs-pino";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AuthAuditLogger } from "./auth-audit.logger";
import { buildAuthRequestContext, buildTokenRequestContext } from "./auth-request-context";

interface TestPinoSink {
  error?: ReturnType<typeof vi.fn>;
  info: ReturnType<typeof vi.fn>;
}

const originalPinoRootDescriptor = Object.getOwnPropertyDescriptor(PinoLogger, "root");

afterEach(() => {
  restorePinoRoot();
});

function createLogger() {
  setPinoRoot(undefined);
  const error = vi.fn();
  const info = vi.fn();
  const pinoLogger = {
    error,
    info,
  } as unknown as PinoLogger;

  return {
    auditLogger: new AuthAuditLogger(pinoLogger),
    error,
    info,
  };
}

function setPinoRoot(root: TestPinoSink | undefined): void {
  Object.defineProperty(PinoLogger, "root", {
    configurable: true,
    value: root,
    writable: true,
  });
}

function restorePinoRoot(): void {
  if (originalPinoRootDescriptor === undefined) {
    Reflect.deleteProperty(PinoLogger, "root");
    return;
  }

  Object.defineProperty(PinoLogger, "root", originalPinoRootDescriptor);
}

describe("AuthAuditLogger", () => {
  it("logs signup success with hashed email and request context", () => {
    const { auditLogger, info } = createLogger();

    auditLogger.logSignupSuccess({
      correlationId: "trace-123",
      email: "Person@Example.com ",
      ip: "203.0.113.10",
      userAgent: "Vitest",
      userId: "user-123",
    });

    expect(info).toHaveBeenCalledWith(
      {
        audit: true,
        correlationId: "trace-123",
        emailHash: "542d240129883c019e106e3b1b2d3f3cb3537c43c425364de8e951d5a3083345",
        event: "auth.signup.success",
        ip: "203.0.113.10",
        userAgent: "Vitest",
        userId: "user-123",
      },
      "auth audit event"
    );
  });

  it("logs signin failure without raw credentials or token fields", () => {
    const { auditLogger, info } = createLogger();

    auditLogger.logSigninFailure({
      correlationId: "trace-123",
      email: "person@example.com",
      ip: "203.0.113.10",
      reason: "invalid_credentials",
      userAgent: "Vitest",
    });

    const payload = info.mock.calls[0]?.[0];

    expect(payload).toMatchObject({
      audit: true,
      event: "auth.signin.failure",
      reason: "invalid_credentials",
    });
    expect(JSON.stringify(payload)).not.toContain("person@example.com");
    expect(JSON.stringify(payload)).not.toContain("password");
    expect(JSON.stringify(payload)).not.toContain("token");
    expect(JSON.stringify(payload)).not.toContain("authorization");
  });

  it("logs token failure with safe reason and no authorization value", () => {
    const { auditLogger, info } = createLogger();

    auditLogger.logTokenFailure({
      correlationId: "trace-123",
      ip: "203.0.113.10",
      reason: "invalid_token",
      userAgent: "Vitest",
    });

    const payload = info.mock.calls[0]?.[0];

    expect(info).toHaveBeenCalledWith(
      {
        audit: true,
        correlationId: "trace-123",
        event: "auth.token.failure",
        ip: "203.0.113.10",
        reason: "invalid_token",
        userAgent: "Vitest",
      },
      "auth audit event"
    );
    expect(JSON.stringify(payload)).not.toContain("Bearer secret-token");
  });

  it("logs email verification delivery failure without raw email or token fields", () => {
    const { auditLogger, error } = createLogger();

    auditLogger.logEmailVerificationDeliveryFailure({
      correlationId: "trace-123",
      email: "Person@Example.com ",
      error: new TypeError("smtp rejected"),
      ip: "203.0.113.10",
      userAgent: "Vitest",
      userId: "user-123",
    });

    const payload = error.mock.calls[0]?.[0] as Record<string, unknown>;

    expect(error).toHaveBeenCalledWith(
      {
        audit: true,
        correlationId: "trace-123",
        emailHash: "542d240129883c019e106e3b1b2d3f3cb3537c43c425364de8e951d5a3083345",
        errorName: "TypeError",
        event: "auth.email_verification.delivery_failure",
        ip: "203.0.113.10",
        reason: "delivery_failed",
        userAgent: "Vitest",
        userId: "user-123",
      },
      "auth audit event"
    );
    expect(JSON.stringify(payload)).not.toContain("Person@Example.com");
    expect(JSON.stringify(payload)).not.toContain("secret-verification-token");
  });

  it("logs user lookup failure with whitelist-only payload keys even if email is present", () => {
    const { auditLogger, info } = createLogger();

    auditLogger.logUserLookupFailure({
      correlationId: "trace-123",
      email: "person@example.com",
      ip: "203.0.113.10",
      userAgent: "Vitest",
      userId: "user-123",
    } as Parameters<AuthAuditLogger["logUserLookupFailure"]>[0] & { email: string });

    const payload = info.mock.calls[0]?.[0] as Record<string, unknown>;

    expect(Object.keys(payload).sort()).toEqual([
      "audit",
      "correlationId",
      "event",
      "ip",
      "reason",
      "userAgent",
      "userId",
    ]);
    expect(payload).toEqual({
      audit: true,
      correlationId: "trace-123",
      event: "auth.user_lookup.failure",
      ip: "203.0.113.10",
      reason: "user_not_found",
      userAgent: "Vitest",
      userId: "user-123",
    });
  });

  it("ignores extra secret-bearing fields passed to public log methods", () => {
    const { auditLogger, info } = createLogger();

    auditLogger.logSigninFailure({
      accessToken: "secret-access-token",
      authorization: "Bearer secret-authorization",
      body: { password: "secret-body-password" },
      correlationId: "trace-123",
      email: "person@example.com",
      emailHash: "attacker-controlled-email-hash",
      headers: { authorization: "Bearer secret-header" },
      ip: "203.0.113.10",
      password: "secret-password",
      reason: "invalid_credentials",
      userAgent: "Vitest",
    } as Parameters<AuthAuditLogger["logSigninFailure"]>[0] & Record<string, unknown>);

    const payload = info.mock.calls[0]?.[0] as Record<string, unknown>;
    const serializedPayload = JSON.stringify(payload);

    expect(Object.keys(payload).sort()).toEqual([
      "audit",
      "correlationId",
      "emailHash",
      "event",
      "ip",
      "reason",
      "userAgent",
    ]);
    expect(serializedPayload).not.toContain("secret-access-token");
    expect(serializedPayload).not.toContain("secret-authorization");
    expect(serializedPayload).not.toContain("secret-body-password");
    expect(serializedPayload).not.toContain("secret-header");
    expect(serializedPayload).not.toContain("secret-password");
    expect(serializedPayload).not.toContain("accessToken");
    expect(serializedPayload).not.toContain("authorization");
    expect(serializedPayload).not.toContain("body");
    expect(serializedPayload).not.toContain("headers");
    expect(serializedPayload).not.toContain("password");
    expect(payload.emailHash).not.toBe("attacker-controlled-email-hash");
  });

  it("uses the root logger when present instead of a request-bound logger", () => {
    const requestBoundInfo = vi.fn();
    const rootInfo = vi.fn();

    setPinoRoot({ info: rootInfo });

    const auditLogger = new AuthAuditLogger({
      info: requestBoundInfo,
    } as unknown as PinoLogger);

    auditLogger.logTokenFailure({
      correlationId: "trace-123",
      ip: "203.0.113.10",
      reason: "invalid_token",
      userAgent: "Vitest",
    });

    expect(rootInfo).toHaveBeenCalledWith(
      {
        audit: true,
        correlationId: "trace-123",
        event: "auth.token.failure",
        ip: "203.0.113.10",
        reason: "invalid_token",
        userAgent: "Vitest",
      },
      "auth audit event"
    );
    expect(requestBoundInfo).not.toHaveBeenCalled();
    expect(JSON.stringify(rootInfo.mock.calls[0]?.[0])).not.toContain("Bearer secret-token");
  });
});

describe("auth request context helpers", () => {
  it("prefers request id over inbound correlation header", () => {
    const context = buildAuthRequestContext(
      {
        headers: {
          "user-agent": "Vitest",
          "x-correlation-id": "header-trace",
        },
        id: "request-trace",
        ip: "203.0.113.10",
      } as never,
      "person@example.com"
    );

    expect(context).toEqual({
      correlationId: "request-trace",
      email: "person@example.com",
      ip: "203.0.113.10",
      userAgent: "Vitest",
    });
  });

  it("accepts a single x-correlation-id array value", () => {
    const context = buildTokenRequestContext({
      headers: {
        "x-correlation-id": ["trace-123"],
      },
      ip: "203.0.113.10",
    } as never);

    expect(context.correlationId).toBe("trace-123");
  });

  it("ignores multi-value x-correlation-id arrays", () => {
    const context = buildTokenRequestContext({
      headers: {
        "x-correlation-id": ["trace-123", "trace-456"],
      },
      ip: "203.0.113.10",
    } as never);

    expect(context.correlationId).toBeUndefined();
  });

  it("omits blank IP and user-agent values", () => {
    const context = buildTokenRequestContext({
      headers: {
        "user-agent": " ",
      },
      ip: " ",
    } as never);

    expect(context).toEqual({
      correlationId: undefined,
      ip: undefined,
      userAgent: undefined,
    });
  });

  it("builds token context without email", () => {
    const context = buildTokenRequestContext({
      headers: {},
      ip: "203.0.113.10",
    } as never);

    expect(context).not.toHaveProperty("email");
  });
});
