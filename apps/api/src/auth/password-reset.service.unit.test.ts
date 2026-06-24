import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { verify } from "argon2";
import { createHash, randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from "vitest";

import type { UserPasswordResetState } from "../users/user.types";
import { UsersService } from "../users/users.service";
import { AuthAuditLogger } from "./auth-audit.logger";
import { AuthSessionService } from "./auth-session.service";
import {
  AUTH_TOKEN_DELIVERY,
  type AuthTokenDelivery,
  type AuthTokenDeliveryMessage,
} from "./auth-token.delivery";
import { PasswordResetService } from "./password-reset.service";

const NOW = new Date("2026-06-24T10:00:00.000Z");
const REQUEST_MESSAGE =
  "If an account exists for that email, a password reset link has been prepared.";
const CONFIRM_MESSAGE = "Password has been reset.";
const INVALID_TOKEN_MESSAGE = "Password reset token is invalid or expired.";
const TEST_FIXTURE = {
  alternateToken: testToken("alternate"),
  email: testEmail("person"),
  token: testToken("valid"),
  userId: `user-${randomUUID()}`,
  userName: `Person ${randomUUID()}`,
};

describe("PasswordResetService", () => {
  let service: PasswordResetService;
  let usersService: Pick<
    UsersService,
    "findPasswordResetStateByEmail" | "resetPasswordForToken" | "setPasswordResetToken"
  >;
  let authSessionService: Pick<AuthSessionService, "revokeActiveSessionsForUser">;
  let authAuditLogger: { logPasswordResetDeliveryFailure: ReturnType<typeof vi.fn> };
  let configGet: ReturnType<typeof vi.fn>;
  let sendPasswordResetToken: Mock<AuthTokenDelivery["sendPasswordResetToken"]>;
  let sentMessages: AuthTokenDeliveryMessage[];

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);

    sentMessages = [];
    usersService = {
      findPasswordResetStateByEmail: vi.fn(),
      resetPasswordForToken: vi.fn(),
      setPasswordResetToken: vi.fn(),
    };
    vi.mocked(usersService.setPasswordResetToken).mockResolvedValue(resetUser());
    vi.mocked(usersService.resetPasswordForToken).mockResolvedValue(resetUser());
    authSessionService = {
      revokeActiveSessionsForUser: vi.fn(() => Promise.resolve()),
    };
    authAuditLogger = {
      logPasswordResetDeliveryFailure: vi.fn(),
    };
    configGet = vi.fn(() => 900_000);
    sendPasswordResetToken = vi.fn((message) => {
      sentMessages.push(message);
      return Promise.resolve();
    });

    const moduleRef = await Test.createTestingModule({
      providers: [
        PasswordResetService,
        { provide: UsersService, useValue: usersService },
        { provide: AuthSessionService, useValue: authSessionService },
        { provide: AuthAuditLogger, useValue: authAuditLogger },
        { provide: ConfigService, useValue: { get: configGet } },
        {
          provide: AUTH_TOKEN_DELIVERY,
          useValue: {
            sendPasswordResetToken,
            sendVerificationToken: vi.fn(),
          } satisfies AuthTokenDelivery,
        },
      ],
    }).compile();

    service = moduleRef.get(PasswordResetService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("stores hashed token and sends raw token only to delivery", async () => {
    vi.mocked(usersService.findPasswordResetStateByEmail).mockResolvedValue(resetUser());

    await expect(service.requestReset({ email: TEST_FIXTURE.email })).resolves.toEqual({
      message: REQUEST_MESSAGE,
    });

    const storedInput = vi.mocked(usersService.setPasswordResetToken).mock.calls[0]?.[1];
    const sentMessage = sentMessages[0];
    expect(storedInput).toEqual({
      expiresAt: new Date("2026-06-24T10:15:00.000Z"),
      tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
    expect(sentMessage?.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(storedInput?.tokenHash).toBe(sha256Hex(sentMessage?.token ?? ""));
    expect(storedInput?.tokenHash).not.toBe(sentMessage?.token);
  });

  it("uses a custom reset token TTL when configured", async () => {
    configGet.mockReturnValue(120_000);
    vi.mocked(usersService.findPasswordResetStateByEmail).mockResolvedValue(resetUser());

    await expect(service.requestReset({ email: TEST_FIXTURE.email })).resolves.toEqual({
      message: REQUEST_MESSAGE,
    });

    expect(vi.mocked(usersService.setPasswordResetToken).mock.calls[0]?.[1]).toMatchObject({
      expiresAt: new Date("2026-06-24T10:02:00.000Z"),
    });
  });

  it.each([undefined, "0", "not-a-number"])(
    "falls back to the default reset token TTL for invalid config value %#",
    async (configuredTtl) => {
      configGet.mockReturnValue(configuredTtl);
      vi.mocked(usersService.findPasswordResetStateByEmail).mockResolvedValue(resetUser());

      await expect(service.requestReset({ email: TEST_FIXTURE.email })).resolves.toEqual({
        message: REQUEST_MESSAGE,
      });

      expect(vi.mocked(usersService.setPasswordResetToken).mock.calls[0]?.[1]).toMatchObject({
        expiresAt: new Date("2026-06-24T10:15:00.000Z"),
      });
    }
  );

  it("returns generic response without delivery for unknown emails or failed storage", async () => {
    vi.mocked(usersService.findPasswordResetStateByEmail).mockResolvedValueOnce(null);
    await expect(service.requestReset({ email: TEST_FIXTURE.email })).resolves.toEqual({
      message: REQUEST_MESSAGE,
    });

    vi.mocked(usersService.findPasswordResetStateByEmail).mockResolvedValueOnce(resetUser());
    vi.mocked(usersService.setPasswordResetToken).mockResolvedValueOnce(null);
    await expect(service.requestReset({ email: TEST_FIXTURE.email })).resolves.toEqual({
      message: REQUEST_MESSAGE,
    });

    expect(sentMessages).toHaveLength(0);
  });

  it("returns generic response and logs safely when reset delivery fails", async () => {
    vi.mocked(usersService.findPasswordResetStateByEmail).mockResolvedValue(resetUser());
    sendPasswordResetToken.mockRejectedValue(new Error("delivery failed"));

    await expect(service.requestReset({ email: TEST_FIXTURE.email })).resolves.toEqual({
      message: REQUEST_MESSAGE,
    });

    expect(authAuditLogger.logPasswordResetDeliveryFailure).toHaveBeenCalledWith({
      email: TEST_FIXTURE.email,
      error: expect.any(Error),
      userId: TEST_FIXTURE.userId,
    });
    expect(
      JSON.stringify(authAuditLogger.logPasswordResetDeliveryFailure.mock.calls)
    ).not.toContain("delivery failed");
  });

  it("confirms a valid token once, hashes the password, and revokes active sessions", async () => {
    const tokenHash = sha256Hex(TEST_FIXTURE.token);
    vi.mocked(usersService.findPasswordResetStateByEmail)
      .mockResolvedValueOnce(
        resetUser({
          passwordResetTokenExpiresAt: new Date("2026-06-24T10:01:00.000Z"),
          passwordResetTokenHash: tokenHash,
        })
      )
      .mockResolvedValueOnce(resetUser());

    const result = await service.confirmReset({
      email: TEST_FIXTURE.email,
      newPassword: "NewPassword1!",
      token: TEST_FIXTURE.token,
    });

    expect(result).toEqual({ message: CONFIRM_MESSAGE });
    const passwordHash = vi.mocked(usersService.resetPasswordForToken).mock.calls[0]?.[3];
    expect(passwordHash).toBeDefined();
    expect(await verify(passwordHash ?? "", "NewPassword1!")).toBe(true);
    expect(usersService.resetPasswordForToken).toHaveBeenCalledWith(
      TEST_FIXTURE.userId,
      NOW,
      tokenHash,
      passwordHash
    );
    expect(authSessionService.revokeActiveSessionsForUser).toHaveBeenCalledWith(
      TEST_FIXTURE.userId
    );

    await expect(
      service.confirmReset({
        email: TEST_FIXTURE.email,
        newPassword: "OtherPassword1!",
        token: TEST_FIXTURE.token,
      })
    ).rejects.toMatchObject({ message: INVALID_TOKEN_MESSAGE });
  });

  it("rejects unknown, missing stored token, expired token, wrong token, and lost atomic race", async () => {
    const tokenHash = sha256Hex(TEST_FIXTURE.token);
    const cases: [UserPasswordResetState | null, string][] = [
      [null, TEST_FIXTURE.token],
      [resetUser({ passwordResetTokenHash: null }), TEST_FIXTURE.token],
      [
        resetUser({ passwordResetTokenExpiresAt: null, passwordResetTokenHash: tokenHash }),
        TEST_FIXTURE.token,
      ],
      [
        resetUser({
          passwordResetTokenExpiresAt: new Date("2026-06-24T09:59:59.999Z"),
          passwordResetTokenHash: tokenHash,
        }),
        TEST_FIXTURE.token,
      ],
      [
        resetUser({
          passwordResetTokenExpiresAt: new Date("2026-06-24T10:01:00.000Z"),
          passwordResetTokenHash: tokenHash,
        }),
        TEST_FIXTURE.alternateToken,
      ],
    ];

    for (const [user, token] of cases) {
      vi.mocked(usersService.findPasswordResetStateByEmail).mockResolvedValueOnce(user);
      await expect(
        service.confirmReset({
          email: TEST_FIXTURE.email,
          newPassword: "NewPassword1!",
          token,
        })
      ).rejects.toMatchObject({ message: INVALID_TOKEN_MESSAGE });
    }

    vi.mocked(usersService.findPasswordResetStateByEmail).mockResolvedValueOnce(
      resetUser({
        passwordResetTokenExpiresAt: new Date("2026-06-24T10:01:00.000Z"),
        passwordResetTokenHash: tokenHash,
      })
    );
    vi.mocked(usersService.resetPasswordForToken).mockResolvedValueOnce(null);

    await expect(
      service.confirmReset({
        email: TEST_FIXTURE.email,
        newPassword: "NewPassword1!",
        token: TEST_FIXTURE.token,
      })
    ).rejects.toMatchObject({ message: INVALID_TOKEN_MESSAGE });
  });
});

function resetUser(overrides: Partial<UserPasswordResetState> = {}): UserPasswordResetState {
  return {
    email: TEST_FIXTURE.email,
    id: TEST_FIXTURE.userId,
    name: TEST_FIXTURE.userName,
    passwordResetTokenExpiresAt: null,
    passwordResetTokenHash: null,
    ...overrides,
  };
}

function sha256Hex(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function testEmail(label: string): string {
  return `${label}-${randomUUID()}@example.test`;
}

function testToken(label: string): string {
  return `${label}-${randomUUID()}`;
}
