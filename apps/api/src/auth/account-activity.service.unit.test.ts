import { Logger } from "@nestjs/common";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AccountActivityRepository } from "./account-activity.repository";
import { AccountActivityService } from "./account-activity.service";

describe("AccountActivityService", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("records user-safe account activity types", async () => {
    const { repository, service } = createService();
    const occurredAt = new Date("2026-06-24T10:00:00.000Z");

    await service.recordAccountCreated("user-123", occurredAt);
    await service.recordSignedIn("user-123", occurredAt);
    await service.recordSignedOut("user-123", occurredAt);
    await service.recordEmailVerified("user-123", occurredAt);

    expect(repository.create).toHaveBeenNthCalledWith(1, {
      occurredAt,
      type: "account.created",
      userId: "user-123",
    });
    expect(repository.create).toHaveBeenNthCalledWith(2, {
      occurredAt,
      type: "auth.signed_in",
      userId: "user-123",
    });
    expect(repository.create).toHaveBeenNthCalledWith(3, {
      occurredAt,
      type: "auth.signed_out",
      userId: "user-123",
    });
    expect(repository.create).toHaveBeenNthCalledWith(4, {
      occurredAt,
      type: "email.verified",
      userId: "user-123",
    });
  });

  it("maps stored events to a safe public response", async () => {
    const { repository, service } = createService();
    repository.listRecentForUser.mockResolvedValue([
      {
        id: "event-2",
        occurredAt: new Date("2026-06-24T10:02:00.000Z"),
        type: "auth.signed_in",
        userId: "user-123",
      },
      {
        id: "event-1",
        occurredAt: new Date("2026-06-24T10:00:00.000Z"),
        type: "account.created",
        userId: "user-123",
      },
    ]);

    const response = await service.listRecentForUser("user-123");

    expect(response).toEqual({
      activities: [
        {
          description: "Signed in",
          id: "event-2",
          occurredAt: "2026-06-24T10:02:00.000Z",
          type: "auth.signed_in",
        },
        {
          description: "Account created",
          id: "event-1",
          occurredAt: "2026-06-24T10:00:00.000Z",
          type: "account.created",
        },
      ],
      limit: 20,
    });
    expect(repository.listRecentForUser).toHaveBeenCalledWith("user-123", 20);
    expect(JSON.stringify(response)).not.toContain("user-123");
  });

  it("logs and suppresses account activity persistence failures", async () => {
    const { repository, service } = createService();
    const occurredAt = new Date("2026-06-24T10:00:00.000Z");
    const error = new Error("activity store unavailable");
    const loggerError = vi.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
    repository.create.mockRejectedValue(error);

    await expect(service.recordSignedIn("user-123", occurredAt)).resolves.toBeUndefined();

    expect(loggerError).toHaveBeenCalledWith(
      'Failed to record account activity event "auth.signed_in" for user "user-123".',
      error.stack
    );
    expect(repository.create).toHaveBeenCalledWith({
      occurredAt,
      type: "auth.signed_in",
      userId: "user-123",
    });
  });
});

function createService(): {
  repository: {
    create: ReturnType<typeof vi.fn>;
    listRecentForUser: ReturnType<typeof vi.fn>;
  };
  service: AccountActivityService;
} {
  const repository = {
    create: vi.fn(() => Promise.resolve()),
    listRecentForUser: vi.fn(() => Promise.resolve([])),
  };

  return {
    repository,
    service: new AccountActivityService(repository as unknown as AccountActivityRepository),
  };
}
