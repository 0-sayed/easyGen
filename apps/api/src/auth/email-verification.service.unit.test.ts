import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { UserVerificationState } from "../users/user.types";
import { UsersService } from "../users/users.service";
import {
  EMAIL_VERIFICATION_DELIVERY,
  type EmailVerificationDelivery,
  type EmailVerificationDeliveryMessage,
} from "./email-verification.delivery";
import { EmailVerificationService } from "./email-verification.service";

const NOW = new Date("2026-06-21T10:00:00.000Z");
const INVALID_TOKEN_MESSAGE = "Verification token is invalid or expired.";
const REQUEST_MESSAGE =
  "If an account exists for that email, a verification link has been prepared.";

describe("EmailVerificationService", () => {
  let service: EmailVerificationService;
  let usersService: Pick<
    UsersService,
    "findVerificationStateByEmail" | "markEmailVerifiedForToken" | "setEmailVerificationToken"
  >;
  let configGet: ReturnType<typeof vi.fn>;
  let delivery: EmailVerificationDelivery;
  let sentMessages: EmailVerificationDeliveryMessage[];

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
    delivery = {
      sendVerificationToken: vi.fn((message) => {
        sentMessages.push(message);
        return Promise.resolve();
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        EmailVerificationService,
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
          provide: EMAIL_VERIFICATION_DELIVERY,
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

    const result = await service.requestVerification({ email: "person@example.com" });

    expect(result).toEqual({ message: REQUEST_MESSAGE });
    expect(usersService.setEmailVerificationToken).toHaveBeenCalledTimes(1);
    expect(usersService.setEmailVerificationToken).toHaveBeenCalledWith("user-id", {
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

    await expect(service.requestVerification({ email: "person@example.com" })).resolves.toEqual({
      message: REQUEST_MESSAGE,
    });

    expect(usersService.setEmailVerificationToken).toHaveBeenCalledTimes(1);
    expect(sentMessages).toHaveLength(0);
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

      await service.requestVerification({ email: "person@example.com" });

      expect(
        vi.mocked(usersService.setEmailVerificationToken).mock.lastCall?.[1].expiresAt
      ).toEqual(expectedExpiresAt);
    }
  });

  it("returns generic response for unknown and already verified emails without storage or delivery", async () => {
    vi.mocked(usersService.findVerificationStateByEmail)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(verifiedUser());

    await expect(service.requestVerification({ email: "missing@example.com" })).resolves.toEqual({
      message: REQUEST_MESSAGE,
    });
    await expect(service.requestVerification({ email: "person@example.com" })).resolves.toEqual({
      message: REQUEST_MESSAGE,
    });

    expect(usersService.setEmailVerificationToken).not.toHaveBeenCalled();
    expect(sentMessages).toHaveLength(0);
  });

  it("confirms valid token once and returns verified public user", async () => {
    const token = "valid-token";
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

    const result = await service.confirmVerification({ email: "person@example.com", token });

    expect(usersService.markEmailVerifiedForToken).toHaveBeenCalledWith(
      "user-id",
      new Date("2026-06-21T10:00:00.000Z"),
      sha256Hex(token)
    );
    expect(result).toEqual({
      user: {
        email: "person@example.com",
        emailVerified: true,
        id: "user-id",
        name: "Person Name",
      },
    });

    await expect(
      service.confirmVerification({ email: "person@example.com", token })
    ).rejects.toMatchObject({
      message: INVALID_TOKEN_MESSAGE,
    });
    expect(usersService.markEmailVerifiedForToken).toHaveBeenCalledTimes(1);
  });

  it("rejects valid tokens when atomic token consumption loses the race", async () => {
    const token = "valid-token";
    const tokenHash = sha256Hex(token);
    vi.mocked(usersService.findVerificationStateByEmail).mockResolvedValue(
      unverifiedUser({
        emailVerificationTokenExpiresAt: new Date("2026-06-21T10:01:00.000Z"),
        emailVerificationTokenHash: tokenHash,
      })
    );
    vi.mocked(usersService.markEmailVerifiedForToken).mockResolvedValue(null);

    await expect(
      service.confirmVerification({ email: "person@example.com", token })
    ).rejects.toMatchObject({
      message: INVALID_TOKEN_MESSAGE,
    });

    expect(usersService.markEmailVerifiedForToken).toHaveBeenCalledWith(
      "user-id",
      new Date("2026-06-21T10:00:00.000Z"),
      tokenHash
    );
  });

  it("safely rejects unknown, missing stored token, expired token, and wrong token", async () => {
    const cases: [string, UserVerificationState | null, string][] = [
      ["unknown user", null, "token"],
      ["missing stored token", unverifiedUser({ emailVerificationTokenHash: null }), "token"],
      [
        "missing stored expiry",
        unverifiedUser({
          emailVerificationTokenExpiresAt: null,
          emailVerificationTokenHash: sha256Hex("token"),
        }),
        "token",
      ],
      [
        "expired token",
        unverifiedUser({
          emailVerificationTokenExpiresAt: new Date("2026-06-21T09:59:59.999Z"),
          emailVerificationTokenHash: sha256Hex("token"),
        }),
        "token",
      ],
      [
        "wrong token",
        unverifiedUser({
          emailVerificationTokenExpiresAt: new Date("2026-06-21T10:01:00.000Z"),
          emailVerificationTokenHash: sha256Hex("expected-token"),
        }),
        "wrong-token",
      ],
    ];

    for (const [, user, token] of cases) {
      vi.mocked(usersService.findVerificationStateByEmail).mockResolvedValueOnce(user);

      await expect(
        service.confirmVerification({ email: "person@example.com", token })
      ).rejects.toMatchObject({
        message: INVALID_TOKEN_MESSAGE,
      });
    }

    expect(usersService.markEmailVerifiedForToken).not.toHaveBeenCalled();
  });
});

function unverifiedUser(overrides: Partial<UserVerificationState> = {}): UserVerificationState {
  return {
    email: "person@example.com",
    emailVerificationTokenExpiresAt: null,
    emailVerificationTokenHash: null,
    emailVerifiedAt: null,
    id: "user-id",
    name: "Person Name",
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
