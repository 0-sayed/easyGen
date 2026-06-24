import { UnauthorizedException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import { AuthAuditLogger } from "./auth-audit.logger";
import type { AuthenticatedRequest } from "./authenticated-request";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { AuthThrottleService } from "./auth-throttle.service";
import { EmailVerificationService } from "./email-verification.service";

describe("AuthController", () => {
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
} {
  const authService = {
    logout: vi.fn(() => Promise.resolve()),
  };
  const emailVerificationService = {
    confirmVerification: vi.fn(),
    requestVerification: vi.fn(),
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
      authThrottleService as unknown as AuthThrottleService,
      authAuditLogger as unknown as AuthAuditLogger
    ),
    authService,
  };
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
