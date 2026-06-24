import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

import { InMemoryAuthTokenDelivery, LogAuthTokenDelivery } from "./auth-token.delivery";

describe("InMemoryAuthTokenDelivery", () => {
  it("retains only the newest verification messages within its configured bound", async () => {
    const delivery = new InMemoryAuthTokenDelivery(2);
    const first = testMessage("first");
    const second = testMessage("second");
    const third = testMessage("third");

    await delivery.sendVerificationToken(first);
    await delivery.sendVerificationToken(second);
    await delivery.sendVerificationToken(third);

    expect(delivery.drainVerificationMessages()).toEqual([second, third]);
    expect(delivery.drainVerificationMessages()).toEqual([]);
  });

  it("retains password reset messages separately from verification messages", async () => {
    const delivery = new InMemoryAuthTokenDelivery(2);
    const verification = testMessage("verification");
    const reset = testMessage("reset");

    await delivery.sendVerificationToken(verification);
    await delivery.sendPasswordResetToken(reset);

    expect(delivery.drainVerificationMessages()).toEqual([verification]);
    expect(delivery.drainPasswordResetMessages()).toEqual([reset]);
  });

  it("does not retain raw password reset tokens in its internal queued state", async () => {
    const delivery = new InMemoryAuthTokenDelivery(2);
    const reset = testMessage("reset");

    await delivery.sendPasswordResetToken(reset);

    expect(JSON.stringify(delivery)).not.toContain(reset.token);
    expect(delivery.drainPasswordResetMessages()).toEqual([reset]);
  });
});

describe("LogAuthTokenDelivery", () => {
  it("writes verification metadata without exposing the raw token", async () => {
    const info = vi.fn();
    const delivery = new LogAuthTokenDelivery({ info });
    const message = testMessage("verification");

    await delivery.sendVerificationToken(message);

    expect(info).toHaveBeenCalledWith(
      {
        email: message.email,
        event: "auth.email_verification.token",
        expiresAt: "2026-06-21T10:15:00.000Z",
      },
      "email verification token prepared"
    );
    expect(JSON.stringify(info.mock.calls)).not.toContain(message.token);
  });

  it("writes password reset metadata without exposing the raw token", async () => {
    const info = vi.fn();
    const delivery = new LogAuthTokenDelivery({ info });
    const message = testMessage("password-reset");

    await delivery.sendPasswordResetToken(message);

    expect(info).toHaveBeenCalledWith(
      {
        email: message.email,
        event: "auth.password_reset.token",
        expiresAt: "2026-06-21T10:15:00.000Z",
      },
      "password reset token prepared"
    );
    expect(JSON.stringify(info.mock.calls)).not.toContain(message.token);
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
