import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

import {
  InMemoryEmailVerificationDelivery,
  LogEmailVerificationDelivery,
} from "./email-verification.delivery";

describe("InMemoryEmailVerificationDelivery", () => {
  it("retains only the newest messages within its configured bound", async () => {
    const delivery = new InMemoryEmailVerificationDelivery(2);
    const first = testMessage("first");
    const second = testMessage("second");
    const third = testMessage("third");

    await delivery.sendVerificationToken(first);
    await delivery.sendVerificationToken(second);
    await delivery.sendVerificationToken(third);

    expect(delivery.drainMessages()).toEqual([second, third]);
    expect(delivery.drainMessages()).toEqual([]);
  });
});

describe("LogEmailVerificationDelivery", () => {
  it("writes verification metadata without exposing the raw token", async () => {
    const info = vi.fn();
    const delivery = new LogEmailVerificationDelivery({ info });
    const verificationMessage = testMessage("metadata");

    await delivery.sendVerificationToken(verificationMessage);

    expect(info).toHaveBeenCalledWith(
      {
        email: verificationMessage.email,
        event: "auth.email_verification.token",
        expiresAt: "2026-06-21T10:15:00.000Z",
      },
      "email verification token prepared"
    );
    expect(JSON.stringify(info.mock.calls)).not.toContain(verificationMessage.token);
  });
});

function testMessage(label: string) {
  return message(testEmail(label), testToken(label));
}

function message(email: string, token: string) {
  return {
    email,
    expiresAt: new Date("2026-06-21T10:15:00.000Z"),
    token,
  };
}

function testEmail(label: string): string {
  return `${label}-${randomUUID()}@example.test`;
}

function testToken(label: string): string {
  return `${label}-${randomUUID()}`;
}
