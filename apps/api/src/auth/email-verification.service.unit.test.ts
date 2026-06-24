import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { createHash, randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from "vitest";

import type { UserVerificationState } from "../users/user.types";
import { UsersService } from "../users/users.service";
import { AccountActivityService } from "./account-activity.service";
import { AuthAuditLogger } from "./auth-audit.logger";
import {
  AUTH_TOKEN_DELIVERY,
  type AuthTokenDelivery,
  type AuthTokenDeliveryMessage,
} from "./auth-token.delivery";
import { EmailVerificationService } from "./email-verification.service";

const NOW = new Date("2026-06-21T10:00:00.000Z");
const INVALID_TOKEN_MESSAGE = "Verification token is invalid or expired.";
const REQUEST_MESSAGE =
  "If an account exists for that email, a verification link has been prepared.";
const TEST_FIXTURE = {
  email: testEmail("person"),
  missingEmail: testEmail("missing"),
  token: testToken("valid"),
  alternateToken: testToken("alternate"),
  userId: `user-${randomUUID()}`,
  userName: `Person ${randomUUID()}`,
};

describe("EmailVerificationService", () => {
  let service: EmailVerificationService;
  let usersService: Pick<
    UsersService,
    "findVerificationStateByEmail" | "markEmailVerifiedForToken" | "setEmailVerificationToken"
  >;
  let configGet: ReturnType<typeof vi.fn>;
  let delivery: AuthTokenDelivery;
  let sendVerificationToken: Mock<AuthTokenDelivery["sendVerificationToken"]>;
  let authAuditLogger: { logEmailVerificationDeliveryFailure: ReturnType<typeof vi.fn> };
  let accountActivityService: { recordEmailVerified: ReturnType<typeof vi.fn> };
  let sentMessages: AuthTokenDeliveryMessage[];

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);

    sentMessages = [];
    usersService = {
      findVerificationStateByEmail: vi.fn(),
      markEmailVerifiedForToken: vi.fn(),
      setEmailVerificationToken: vi.fn(),
    };
    vi.mocked(usersService.setEmailVerificationToken).mockResolvedValue(unverifiedUser());
    configGet = vi.fn(() => 900_000);
    sendVerificationToken = vi.fn((message) => {
      sentMessages.push(message);
      return Promise.resolve();
    });
    delivery = {
      sendPasswordResetToken: vi.fn(),
      sendVerificationToken,
    };
    authAuditLogger = {
      logEmailVerificationDeliveryFailure: vi.fn(),
    };
    accountActivityService = {
      recordEmailVerified: vi.fn(() => Promise.resolve()),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        EmailVerificationService,
        {
          provide: AccountActivityService,
          useValue: accountActivityService,
        },
        {
          provide: AuthAuditLogger,
          useValue: authAuditLogger,
        },
        {
          provide: UsersService,
          useValue: usersService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: configGet,
          },
        },
        {
          provide: AUTH_TOKEN_DELIVERY,
          useValue: delivery,
        },
      ],
    }).compile();

    service = moduleRef.get(EmailVerificationService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("stores hashed token and sends raw token only to delivery", async () => {
    vi.mocked(usersService.findVerificationStateByEmail).mockResolvedValue(unverifiedUser());

    const result = await service.requestVerification({ email: TEST_FIXTURE.email });

    expect(result).toEqual({ message: REQUEST_MESSAGE });
    expect(usersService.setEmailVerificationToken).toHaveBeenCalledTimes(1);
    expect(usersService.setEmailVerificationToken).toHaveBeenCalledWith(TEST_FIXTURE.userId, {
      expiresAt: new Date("2026-06-21T10:15:00.000Z"),
      tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
    expect(sentMessages).toHaveLength(1);

    const sentMessage = sentMessages[0];
    const storedInput = vi.mocked(usersService.setEmailVerificationToken).mock.calls[0]?.[1];

    expect(sentMessage).toBeDefined();
    expect(storedInput).toBeDefined();
    if (sentMessage === undefined || storedInput === undefined) {
      throw new Error("Expected token storage and delivery.");
    }

    const { expiresAt, token } = sentMessage;

    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(storedInput.tokenHash).toBe(sha256Hex(token));
    expect(storedInput.tokenHash).not.toBe(token);
    expect(expiresAt).toEqual(new Date("2026-06-21T10:15:00.000Z"));
  });

  it("returns generic response without delivery when token storage fails", async () => {
    vi.mocked(usersService.findVerificationStateByEmail).mockResolvedValue(unverifiedUser());
    vi.mocked(usersService.setEmailVerificationToken).mockResolvedValue(null);

    await expect(service.requestVerification({ email: TEST_FIXTURE.email })).resolves.toEqual({
      message: REQUEST_MESSAGE,
    });

    expect(usersService.setEmailVerificationToken).toHaveBeenCalledTimes(1);
    expect(sentMessages).toHaveLength(0);
  });

  it("returns generic response when verification delivery fails", async () => {
    vi.mocked(usersService.findVerificationStateByEmail).mockResolvedValue(unverifiedUser());
    sendVerificationToken.mockRejectedValue(new Error("delivery failed"));

    await expect(service.requestVerification({ email: TEST_FIXTURE.email })).resolves.toEqual({
      message: REQUEST_MESSAGE,
    });

    expect(usersService.setEmailVerificationToken).toHaveBeenCalledTimes(1);
    const token = sendVerificationToken.mock.calls[0]?.[0].token;
    expect(authAuditLogger.logEmailVerificationDeliveryFailure).toHaveBeenCalledWith({
      email: TEST_FIXTURE.email,
      error: expect.any(Error),
      userId: TEST_FIXTURE.userId,
    });
    expect(token).toBeDefined();
    if (token === undefined) {
      throw new Error("Expected verification token delivery attempt.");
    }
    expect(
      JSON.stringify(authAuditLogger.logEmailVerificationDeliveryFailure.mock.calls)
    ).not.toContain(token);
  });

  it("uses a positive custom ttl and falls back for invalid ttl values", async () => {
    const cases: [unknown, Date][] = [
      [120_000, new Date("2026-06-21T10:02:00.000Z")],
      ["", new Date("2026-06-21T10:15:00.000Z")],
      [0, new Date("2026-06-21T10:15:00.000Z")],
      [-1, new Date("2026-06-21T10:15:00.000Z")],
      [undefined, new Date("2026-06-21T10:15:00.000Z")],
    ];

    for (const [ttl, expectedExpiresAt] of cases) {
      vi.mocked(usersService.findVerificationStateByEmail).mockResolvedValueOnce(unverifiedUser());
      configGet.mockReturnValueOnce(ttl);

      await service.requestVerification({ email: TEST_FIXTURE.email });

      expect(
        vi.mocked(usersService.setEmailVerificationToken).mock.lastCall?.[1].expiresAt
      ).toEqual(expectedExpiresAt);
    }
  });

  it("returns generic response for unknown and already verified emails without storage or delivery", async () => {
    vi.mocked(usersService.findVerificationStateByEmail)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(verifiedUser());

    await expect(
      service.requestVerification({ email: TEST_FIXTURE.missingEmail })
    ).resolves.toEqual({
      message: REQUEST_MESSAGE,
    });
    await expect(service.requestVerification({ email: TEST_FIXTURE.email })).resolves.toEqual({
      message: REQUEST_MESSAGE,
    });

    expect(usersService.setEmailVerificationToken).not.toHaveBeenCalled();
    expect(sentMessages).toHaveLength(0);
  });

  it("confirms valid token once and returns verified public user", async () => {
    const token = TEST_FIXTURE.token;
    vi.mocked(usersService.findVerificationStateByEmail)
      .mockResolvedValueOnce(
        unverifiedUser({
          emailVerificationTokenExpiresAt: new Date("2026-06-21T10:01:00.000Z"),
          emailVerificationTokenHash: sha256Hex(token),
        })
      )
      .mockResolvedValueOnce(unverifiedUser());
    vi.mocked(usersService.markEmailVerifiedForToken).mockResolvedValue(
      verifiedUser({ emailVerifiedAt: new Date("2026-06-21T10:00:00.000Z") })
    );

    const result = await service.confirmVerification({ email: TEST_FIXTURE.email, token });

    expect(usersService.markEmailVerifiedForToken).toHaveBeenCalledWith(
      TEST_FIXTURE.userId,
      new Date("2026-06-21T10:00:00.000Z"),
      sha256Hex(token)
    );
    expect(result).toEqual({
      user: {
        email: TEST_FIXTURE.email,
        emailVerified: true,
        id: TEST_FIXTURE.userId,
        name: TEST_FIXTURE.userName,
      },
    });
    expect(accountActivityService.recordEmailVerified).toHaveBeenCalledWith(TEST_FIXTURE.userId);

    await expect(
      service.confirmVerification({ email: TEST_FIXTURE.email, token })
    ).rejects.toMatchObject({
      message: INVALID_TOKEN_MESSAGE,
    });
    expect(usersService.markEmailVerifiedForToken).toHaveBeenCalledTimes(1);
  });

  it("rejects valid tokens when atomic token consumption loses the race", async () => {
    const token = TEST_FIXTURE.token;
    const tokenHash = sha256Hex(token);
    vi.mocked(usersService.findVerificationStateByEmail).mockResolvedValue(
      unverifiedUser({
        emailVerificationTokenExpiresAt: new Date("2026-06-21T10:01:00.000Z"),
        emailVerificationTokenHash: tokenHash,
      })
    );
    vi.mocked(usersService.markEmailVerifiedForToken).mockResolvedValue(null);

    await expect(
      service.confirmVerification({ email: TEST_FIXTURE.email, token })
    ).rejects.toMatchObject({
      message: INVALID_TOKEN_MESSAGE,
    });

    expect(usersService.markEmailVerifiedForToken).toHaveBeenCalledWith(
      TEST_FIXTURE.userId,
      new Date("2026-06-21T10:00:00.000Z"),
      tokenHash
    );
    expect(accountActivityService.recordEmailVerified).not.toHaveBeenCalled();
  });

  it("safely rejects unknown, missing stored token, expired token, and wrong token", async () => {
    const cases: [string, UserVerificationState | null, string][] = [
      ["unknown user", null, TEST_FIXTURE.token],
      [
        "missing stored token",
        unverifiedUser({ emailVerificationTokenHash: null }),
        TEST_FIXTURE.token,
      ],
      [
        "missing stored expiry",
        unverifiedUser({
          emailVerificationTokenExpiresAt: null,
          emailVerificationTokenHash: sha256Hex(TEST_FIXTURE.token),
        }),
        TEST_FIXTURE.token,
      ],
      [
        "expired token",
        unverifiedUser({
          emailVerificationTokenExpiresAt: new Date("2026-06-21T09:59:59.999Z"),
          emailVerificationTokenHash: sha256Hex(TEST_FIXTURE.token),
        }),
        TEST_FIXTURE.token,
      ],
      [
        "wrong token",
        unverifiedUser({
          emailVerificationTokenExpiresAt: new Date("2026-06-21T10:01:00.000Z"),
          emailVerificationTokenHash: sha256Hex(TEST_FIXTURE.token),
        }),
        TEST_FIXTURE.alternateToken,
      ],
    ];

    for (const [, user, token] of cases) {
      vi.mocked(usersService.findVerificationStateByEmail).mockResolvedValueOnce(user);

      await expect(
        service.confirmVerification({ email: TEST_FIXTURE.email, token })
      ).rejects.toMatchObject({
        message: INVALID_TOKEN_MESSAGE,
      });
    }

    expect(usersService.markEmailVerifiedForToken).not.toHaveBeenCalled();
    expect(accountActivityService.recordEmailVerified).not.toHaveBeenCalled();
  });
});

function unverifiedUser(overrides: Partial<UserVerificationState> = {}): UserVerificationState {
  return {
    email: TEST_FIXTURE.email,
    emailVerificationTokenExpiresAt: null,
    emailVerificationTokenHash: null,
    emailVerifiedAt: null,
    id: TEST_FIXTURE.userId,
    name: TEST_FIXTURE.userName,
    ...overrides,
  };
}

function verifiedUser(overrides: Partial<UserVerificationState> = {}): UserVerificationState {
  return unverifiedUser({
    emailVerifiedAt: new Date("2026-06-21T09:00:00.000Z"),
    ...overrides,
  });
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
