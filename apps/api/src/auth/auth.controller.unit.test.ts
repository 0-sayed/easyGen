import { UnauthorizedException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import { AccountActivityService } from "./account-activity.service";
import { AuthAuditLogger } from "./auth-audit.logger";
import type { AuthenticatedRequest } from "./authenticated-request";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { AuthThrottleService } from "./auth-throttle.service";
import { EmailVerificationService } from "./email-verification.service";

describe("AuthController", () => {
  it("returns recent activity for the authenticated user", async () => {
    const { accountActivityService, authController } = createController();
    const request = createAuthenticatedRequest();
    accountActivityService.listRecentForUser.mockResolvedValue({
      activities: [
        {
          description: "Signed in",
          id: "event-1",
          occurredAt: "2026-06-24T10:00:00.000Z",
          type: "auth.signed_in",
        },
      ],
      limit: 20,
    });

    await expect(authController.activity(request)).resolves.toEqual({
      activities: [
        {
          description: "Signed in",
          id: "event-1",
          occurredAt: "2026-06-24T10:00:00.000Z",
          type: "auth.signed_in",
        },
      ],
      limit: 20,
    });
    expect(accountActivityService.listRecentForUser).toHaveBeenCalledWith("user-123");
  });

  it("records account creation activity after successful signup", async () => {
    const { accountActivityService, authController } = createController();

    await authController.signup(createPlainRequest(), {
      email: "person@example.com",
      name: "Person Name",
      password: "Password1!",
    });

    expect(accountActivityService.recordAccountCreated).toHaveBeenCalledWith("user-123");
  });

  it("records signin activity after successful signin", async () => {
    const { accountActivityService, authController } = createController();

    await authController.signin(createPlainRequest(), {
      email: "person@example.com",
      password: "Password1!",
    });

    expect(accountActivityService.recordSignedIn).toHaveBeenCalledWith("user-123");
  });

  it("logs out the current token and records logout success", async () => {
    const { accountActivityService, authAuditLogger, authController, authService } =
      createController();
    const request = createAuthenticatedRequest();

    await authController.logout(request);

    expect(authService.logout).toHaveBeenCalledWith(request.user);
    expect(authAuditLogger.logLogoutSuccess).toHaveBeenCalledWith({
      correlationId: "trace-123",
      ip: "203.0.113.10",
      userAgent: "Vitest",
      userId: "user-123",
    });
    expect(accountActivityService.recordSignedOut).toHaveBeenCalledWith("user-123");
    expect(authAuditLogger.logLogoutFailure).not.toHaveBeenCalled();
  });

  it("records logout failure for unauthorized revocation errors and rethrows", async () => {
    const { authAuditLogger, authController, authService } = createController();
    const request = createAuthenticatedRequest();
    const error = new UnauthorizedException("Invalid authentication session.");
    authService.logout.mockRejectedValue(error);

    await expect(authController.logout(request)).rejects.toBe(error);

    expect(authService.logout).toHaveBeenCalledWith(request.user);
    expect(authAuditLogger.logLogoutFailure).toHaveBeenCalledWith({
      correlationId: "trace-123",
      ip: "203.0.113.10",
      userAgent: "Vitest",
      userId: "user-123",
    });
    expect(authAuditLogger.logLogoutSuccess).not.toHaveBeenCalled();
  });

  it("does not record logout failure for operational revocation errors", async () => {
    const { authAuditLogger, authController, authService } = createController();
    const request = createAuthenticatedRequest();
    const error = new Error("Session store unavailable.");
    authService.logout.mockRejectedValue(error);

    await expect(authController.logout(request)).rejects.toBe(error);

    expect(authService.logout).toHaveBeenCalledWith(request.user);
    expect(authAuditLogger.logLogoutFailure).not.toHaveBeenCalled();
    expect(authAuditLogger.logLogoutSuccess).not.toHaveBeenCalled();
  });
});

function createController(): {
  accountActivityService: {
    listRecentForUser: ReturnType<typeof vi.fn>;
    recordAccountCreated: ReturnType<typeof vi.fn>;
    recordSignedIn: ReturnType<typeof vi.fn>;
    recordSignedOut: ReturnType<typeof vi.fn>;
  };
  authAuditLogger: {
    logSigninFailure: ReturnType<typeof vi.fn>;
    logSigninSuccess: ReturnType<typeof vi.fn>;
    logLogoutFailure: ReturnType<typeof vi.fn>;
    logLogoutSuccess: ReturnType<typeof vi.fn>;
    logSignupFailure: ReturnType<typeof vi.fn>;
    logSignupSuccess: ReturnType<typeof vi.fn>;
    logThrottleBlocked: ReturnType<typeof vi.fn>;
  };
  authController: AuthController;
  authService: {
    logout: ReturnType<typeof vi.fn>;
    signin: ReturnType<typeof vi.fn>;
    signup: ReturnType<typeof vi.fn>;
  };
} {
  const authService = {
    logout: vi.fn(() => Promise.resolve()),
    signin: vi.fn(() =>
      Promise.resolve({
        accessToken: "access-token",
        user: {
          email: "person@example.com",
          emailVerified: false,
          id: "user-123",
          name: "Person Name",
        },
      })
    ),
    signup: vi.fn(() =>
      Promise.resolve({
        accessToken: "access-token",
        user: {
          email: "person@example.com",
          emailVerified: false,
          id: "user-123",
          name: "Person Name",
        },
      })
    ),
  };
  const emailVerificationService = {
    confirmVerification: vi.fn(),
    requestVerification: vi.fn(),
  };
  const authAuditLogger = {
    logSigninFailure: vi.fn(),
    logSigninSuccess: vi.fn(),
    logLogoutFailure: vi.fn(),
    logLogoutSuccess: vi.fn(),
    logSignupFailure: vi.fn(),
    logSignupSuccess: vi.fn(),
    logThrottleBlocked: vi.fn(),
  };
  const authThrottleService = {
    consume: vi.fn(() => ({ allowed: true })),
  };
  const accountActivityService = {
    listRecentForUser: vi.fn(() => Promise.resolve({ activities: [], limit: 20 })),
    recordAccountCreated: vi.fn(() => Promise.resolve()),
    recordSignedIn: vi.fn(() => Promise.resolve()),
    recordSignedOut: vi.fn(() => Promise.resolve()),
  };

  return {
    accountActivityService,
    authAuditLogger,
    authController: new AuthController(
      authService as unknown as AuthService,
      emailVerificationService as unknown as EmailVerificationService,
      authThrottleService as unknown as AuthThrottleService,
      authAuditLogger as unknown as AuthAuditLogger,
      accountActivityService as unknown as AccountActivityService
    ),
    authService,
  };
}

function createPlainRequest(): AuthenticatedRequest {
  return {
    headers: {
      "user-agent": "Vitest",
      "x-correlation-id": "header-trace",
    },
    id: "trace-123",
    ip: "203.0.113.10",
  } as unknown as AuthenticatedRequest;
}

function createAuthenticatedRequest(): AuthenticatedRequest {
  return {
    headers: {
      "user-agent": "Vitest",
      "x-correlation-id": "header-trace",
    },
    id: "trace-123",
    ip: "203.0.113.10",
    user: {
      email: "person@example.com",
      jti: "token-id",
      sub: "user-123",
    },
  } as unknown as AuthenticatedRequest;
}
