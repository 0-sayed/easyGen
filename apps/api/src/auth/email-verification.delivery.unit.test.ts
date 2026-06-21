import { describe, expect, it, vi } from "vitest";

import {
  InMemoryEmailVerificationDelivery,
  LogEmailVerificationDelivery,
} from "./email-verification.delivery";

describe("InMemoryEmailVerificationDelivery", () => {
  it("retains only the newest messages within its configured bound", async () => {
    const delivery = new InMemoryEmailVerificationDelivery(2);

    await delivery.sendVerificationToken(message("first@example.com", "first-token"));
    await delivery.sendVerificationToken(message("second@example.com", "second-token"));
    await delivery.sendVerificationToken(message("third@example.com", "third-token"));

    expect(delivery.drainMessages()).toEqual([
      message("second@example.com", "second-token"),
      message("third@example.com", "third-token"),
    ]);
    expect(delivery.drainMessages()).toEqual([]);
  });
});

describe("LogEmailVerificationDelivery", () => {
  it("writes verification metadata without exposing the raw token", async () => {
    const info = vi.fn();
    const delivery = new LogEmailVerificationDelivery({ info });

    await delivery.sendVerificationToken(message("person@example.com", "raw-token"));

    expect(info).toHaveBeenCalledWith(
      {
        email: "person@example.com",
        event: "auth.email_verification.token",
        expiresAt: "2026-06-21T10:15:00.000Z",
      },
      "email verification token prepared"
    );
    expect(JSON.stringify(info.mock.calls)).not.toContain("raw-token");
  });
});

function message(email: string, token: string) {
  return {
    email,
    expiresAt: new Date("2026-06-21T10:15:00.000Z"),
    token,
  };
}
