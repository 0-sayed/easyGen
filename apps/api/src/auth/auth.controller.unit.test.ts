import { UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";
import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

import { AccountActivityService } from "./account-activity.service";
import { AuthAuditLogger } from "./auth-audit.logger";
import type { AuthenticatedRequest } from "./authenticated-request";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { AuthThrottleService } from "./auth-throttle.service";
import { EmailVerificationService } from "./email-verification.service";
import { PasswordResetService } from "./password-reset.service";

const TEST_FIXTURE = {
  accessToken: testToken("access"),
  email: testEmail("person"),
  password: testPassword(),
  tokenId: testToken("session"),
  userId: `user-${randomUUID()}`,
  userName: `Person ${randomUUID()}`,
};

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
    expect(accountActivityService.listRecentForUser).toHaveBeenCalledWith(TEST_FIXTURE.userId);
  });

  it("records account creation activity after successful signup", async () => {
    const { accountActivityService, authController } = createController();

    await authController.signup(createRequest(), {
      email: TEST_FIXTURE.email,
      name: TEST_FIXTURE.userName,
      password: TEST_FIXTURE.password,
    });

    expect(accountActivityService.recordAccountCreated).toHaveBeenCalledWith(TEST_FIXTURE.userId);
  });

  it("records signin activity after successful signin", async () => {
    const { accountActivityService, authController } = createController();

    await authController.signin(createRequest(), {
      email: TEST_FIXTURE.email,
      password: TEST_FIXTURE.password,
    });

    expect(accountActivityService.recordSignedIn).toHaveBeenCalledWith(TEST_FIXTURE.userId);
  });

  it("delegates password reset request after throttle passes", async () => {
    const { authController, authThrottleService, passwordResetService } = createController();
    authThrottleService.consume.mockReturnValue({ allowed: true });
    const request = createRequest();
    const dto = { email: "person@example.com" };

    await expect(authController.requestPasswordReset(request, dto)).resolves.toEqual({
      message: "If an account exists for that email, a password reset link has been prepared.",
    });

    expect(authThrottleService.consume).toHaveBeenCalledWith({
      email: dto.email,
      ip: "203.0.113.10",
      scope: "password-reset-request",
    });
    expect(passwordResetService.requestReset).toHaveBeenCalledWith(dto);
  });

  it("delegates password reset confirm after throttle passes", async () => {
    const { authController, authThrottleService, passwordResetService } = createController();
    authThrottleService.consume.mockReturnValue({ allowed: true });
    const request = createRequest();
    const dto = {
      email: "person@example.com",
      newPassword: "NewPassword1!",
      token: "reset-token",
    };

    await expect(authController.confirmPasswordReset(request, dto)).resolves.toEqual({
      message: "Password has been reset.",
    });

    expect(authThrottleService.consume).toHaveBeenCalledWith({
      email: dto.email,
      ip: "203.0.113.10",
      scope: "password-reset-confirm",
    });
    expect(passwordResetService.confirmReset).toHaveBeenCalledWith(dto);
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
      userId: TEST_FIXTURE.userId,
    });
    expect(accountActivityService.recordSignedOut).toHaveBeenCalledWith(TEST_FIXTURE.userId);
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
      userId: TEST_FIXTURE.userId,
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
  authThrottleService: {
    consume: ReturnType<typeof vi.fn>;
  };
  passwordResetService: {
    confirmReset: ReturnType<typeof vi.fn>;
    requestReset: ReturnType<typeof vi.fn>;
  };
} {
  const authService = {
    logout: vi.fn(() => Promise.resolve()),
    signin: vi.fn(() =>
      Promise.resolve({
        accessToken: TEST_FIXTURE.accessToken,
        user: {
          email: TEST_FIXTURE.email,
          emailVerified: false,
          id: TEST_FIXTURE.userId,
          name: TEST_FIXTURE.userName,
        },
      })
    ),
    signup: vi.fn(() =>
      Promise.resolve({
        accessToken: TEST_FIXTURE.accessToken,
        user: {
          email: TEST_FIXTURE.email,
          emailVerified: false,
          id: TEST_FIXTURE.userId,
          name: TEST_FIXTURE.userName,
        },
      })
    ),
  };
  const emailVerificationService = {
    confirmVerification: vi.fn(),
    requestVerification: vi.fn(),
  };
  const passwordResetService = {
    confirmReset: vi.fn(() => Promise.resolve({ message: "Password has been reset." })),
    requestReset: vi.fn(() =>
      Promise.resolve({
        message: "If an account exists for that email, a password reset link has been prepared.",
      })
    ),
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
      passwordResetService as unknown as PasswordResetService,
      authThrottleService as unknown as AuthThrottleService,
      authAuditLogger as unknown as AuthAuditLogger,
      accountActivityService as unknown as AccountActivityService
    ),
    authService,
    authThrottleService,
    passwordResetService,
  };
}

function createRequest(): Request {
  return {
    headers: {
      "user-agent": "Vitest",
      "x-correlation-id": "header-trace",
    },
    id: "trace-123",
    ip: "203.0.113.10",
  } as unknown as Request;
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
      email: TEST_FIXTURE.email,
      jti: TEST_FIXTURE.tokenId,
      sub: TEST_FIXTURE.userId,
    },
  } as unknown as AuthenticatedRequest;
}

function testEmail(label: string): string {
  return `${label}-${randomUUID()}@example.test`;
}

function testPassword(): string {
  return `Password-${randomUUID()}!1`;
}

function testToken(label: string): string {
  return `${label}-${randomUUID()}`;
}
