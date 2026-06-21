import type { ExecutionContext } from "@nestjs/common";
import { UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthAuditLogger } from "./auth-audit.logger";
import { AuthSessionService } from "./auth-session.service";
import { JwtAuthGuard } from "./jwt-auth.guard";
import type { JwtPayload } from "./jwt-payload";

interface GuardTestRequest {
  headers: Record<string, string | string[]>;
  id?: string;
  ip?: string;
  user?: JwtPayload;
}

describe("JwtAuthGuard", () => {
  let authAuditLogger: Pick<AuthAuditLogger, "logTokenFailure">;
  let authSessionService: Pick<AuthSessionService, "assertActive">;
  let guard: JwtAuthGuard;
  let jwtService: Pick<JwtService, "verifyAsync">;

  const payload: JwtPayload = {
    email: "person@example.com",
    jti: "token-id",
    sub: "user-id",
  };

  beforeEach(() => {
    authAuditLogger = {
      logTokenFailure: vi.fn(),
    };
    authSessionService = {
      assertActive: vi.fn(),
    };
    jwtService = {
      verifyAsync: vi.fn(),
    };
    guard = new JwtAuthGuard(
      jwtService as JwtService,
      authAuditLogger as AuthAuditLogger,
      authSessionService as AuthSessionService
    );
  });

  it("attaches the payload and returns true for an active JWT with an active session", async () => {
    vi.mocked(jwtService.verifyAsync).mockResolvedValue(payload);
    vi.mocked(authSessionService.assertActive).mockResolvedValue(undefined);
    const request = createRequest("Bearer access-token");

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);

    expect(jwtService.verifyAsync).toHaveBeenCalledWith("access-token");
    expect(authSessionService.assertActive).toHaveBeenCalledWith(payload);
    expect(request.user).toBe(payload);
    expect(authAuditLogger.logTokenFailure).not.toHaveBeenCalled();
  });

  it("rejects with UnauthorizedException when the session is inactive", async () => {
    vi.mocked(jwtService.verifyAsync).mockResolvedValue(payload);
    vi.mocked(authSessionService.assertActive).mockRejectedValue(new UnauthorizedException());
    const request = createRequest("Bearer access-token");

    await expect(guard.canActivate(createContext(request))).rejects.toBeInstanceOf(
      UnauthorizedException
    );

    expect(authSessionService.assertActive).toHaveBeenCalledWith(payload);
    expect(request.user).toBeUndefined();
    expect(authAuditLogger.logTokenFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: "invalid_token",
      })
    );
  });

  it("logs invalid token failures without checking the session", async () => {
    vi.mocked(jwtService.verifyAsync).mockRejectedValue(new Error("bad token"));
    const request = createRequest("Bearer bad-token", {
      headers: {
        "user-agent": "Vitest",
        "x-correlation-id": "trace-123",
      },
      ip: "203.0.113.10",
    });

    await expect(guard.canActivate(createContext(request))).rejects.toBeInstanceOf(
      UnauthorizedException
    );

    expect(authAuditLogger.logTokenFailure).toHaveBeenCalledWith({
      correlationId: "trace-123",
      ip: "203.0.113.10",
      reason: "invalid_token",
      userAgent: "Vitest",
    });
    expect(authSessionService.assertActive).not.toHaveBeenCalled();
    expect(request.user).toBeUndefined();
  });

  it("propagates unexpected session assertion errors without attaching the payload", async () => {
    const error = new Error("session store unavailable");
    vi.mocked(jwtService.verifyAsync).mockResolvedValue(payload);
    vi.mocked(authSessionService.assertActive).mockRejectedValue(error);
    const request = createRequest("Bearer access-token");

    await expect(guard.canActivate(createContext(request))).rejects.toBe(error);

    expect(authSessionService.assertActive).toHaveBeenCalledWith(payload);
    expect(request.user).toBeUndefined();
    expect(authAuditLogger.logTokenFailure).not.toHaveBeenCalled();
  });
});

function createRequest(
  authorization: string,
  overrides: { headers?: Record<string, string | string[]>; ip?: string } = {}
): GuardTestRequest {
  return {
    headers: {
      authorization,
      ...overrides.headers,
    },
    ip: overrides.ip,
  };
}

function createContext(request: GuardTestRequest): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as ExecutionContext;
}
