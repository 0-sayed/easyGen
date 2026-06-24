import type { Model } from "mongoose";
import { describe, expect, it, vi } from "vitest";

import { AccountActivityRepository } from "./account-activity.repository";
import { AccountActivityEvent } from "./schemas/account-activity-event.schema";

describe("AccountActivityRepository", () => {
  it("sorts recent activity using the account activity compound index order", async () => {
    const exec = vi.fn(() => Promise.resolve([]));
    const lean = vi.fn(() => ({ exec }));
    const limit = vi.fn(() => ({ lean }));
    const sort = vi.fn(() => ({ limit }));
    const find = vi.fn(() => ({ sort }));
    const repository = new AccountActivityRepository({
      find,
    } as unknown as Model<AccountActivityEvent>);

    await repository.listRecentForUser("user-123", 20);

    expect(find).toHaveBeenCalledWith({ userId: "user-123" });
    expect(sort).toHaveBeenCalledWith({ occurredAt: -1 });
    expect(limit).toHaveBeenCalledWith(20);
  });
});
