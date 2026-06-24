import { UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";
import { describe, expect, it, vi } from "vitest";

import { AuthAuditLogger } from "./auth-audit.logger";
import type { AuthenticatedRequest } from "./authenticated-request";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { AuthThrottleService } from "./auth-throttle.service";
import { EmailVerificationService } from "./email-verification.service";
import { PasswordResetService } from "./password-reset.service";

describe("AuthController", () => {
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
    const { authAuditLogger, authController, authService } = createController();
    const request = createAuthenticatedRequest();

    await authController.logout(request);

    expect(authService.logout).toHaveBeenCalledWith(request.user);
    expect(authAuditLogger.logLogoutSuccess).toHaveBeenCalledWith({
      correlationId: "trace-123",
      ip: "203.0.113.10",
      userAgent: "Vitest",
      userId: "user-123",
    });
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
  authAuditLogger: {
    logLogoutFailure: ReturnType<typeof vi.fn>;
    logLogoutSuccess: ReturnType<typeof vi.fn>;
  };
  authController: AuthController;
  authService: {
    logout: ReturnType<typeof vi.fn>;
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
    logLogoutFailure: vi.fn(),
    logLogoutSuccess: vi.fn(),
  };
  const authThrottleService = {
    consume: vi.fn(),
  };

  return {
    authAuditLogger,
    authController: new AuthController(
      authService as unknown as AuthService,
      emailVerificationService as unknown as EmailVerificationService,
      passwordResetService as unknown as PasswordResetService,
      authThrottleService as unknown as AuthThrottleService,
      authAuditLogger as unknown as AuthAuditLogger
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
      email: "person@example.com",
      jti: "token-id",
      sub: "user-123",
    },
  } as unknown as AuthenticatedRequest;
}
