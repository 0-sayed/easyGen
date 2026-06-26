import { NotFoundException } from "@nestjs/common";
import { afterEach, describe, expect, it } from "vitest";

import {
  AuthTestSupportController,
  isAuthTestSupportEnabled,
} from "./auth-test-support.controller";
import { InMemoryAuthTokenDelivery, LogAuthTokenDelivery } from "./auth-token.delivery";

const originalNodeEnv = process.env.NODE_ENV;
const originalAuthTestSupport = process.env.AUTH_TEST_SUPPORT;

describe("AuthTestSupportController", () => {
  afterEach(() => {
    restoreEnv();
  });

  it("drains verification and password reset messages when explicit test support is enabled", async () => {
    process.env.NODE_ENV = "test";
    process.env.AUTH_TEST_SUPPORT = "1";
    const delivery = new InMemoryAuthTokenDelivery();
    const controller = new AuthTestSupportController(delivery);

    await delivery.sendVerificationToken({
      email: "verify@example.com",
      expiresAt: new Date("2026-06-26T10:00:00.000Z"),
      token: "verification-token",
    });
    await delivery.sendPasswordResetToken({
      email: "reset@example.com",
      expiresAt: new Date("2026-06-26T10:05:00.000Z"),
      token: "reset-token",
    });

    expect(controller.drainVerificationMessages()).toEqual({
      messages: [
        {
          email: "verify@example.com",
          expiresAt: "2026-06-26T10:00:00.000Z",
          token: "verification-token",
        },
      ],
    });
    expect(controller.drainPasswordResetMessages()).toEqual({
      messages: [
        {
          email: "reset@example.com",
          expiresAt: "2026-06-26T10:05:00.000Z",
          token: "reset-token",
        },
      ],
    });
    expect(controller.drainVerificationMessages()).toEqual({ messages: [] });
    expect(controller.drainPasswordResetMessages()).toEqual({ messages: [] });
  });

  it("returns 404 when test support is not explicitly enabled", () => {
    process.env.NODE_ENV = "test";
    delete process.env.AUTH_TEST_SUPPORT;
    const controller = new AuthTestSupportController(new InMemoryAuthTokenDelivery());

    expect(() => controller.drainVerificationMessages()).toThrow(NotFoundException);
    expect(() => controller.drainPasswordResetMessages()).toThrow(NotFoundException);
  });

  it("returns 404 when the runtime delivery is not the in-memory test delivery", () => {
    process.env.NODE_ENV = "test";
    process.env.AUTH_TEST_SUPPORT = "1";
    const controller = new AuthTestSupportController(
      new LogAuthTokenDelivery({ info: () => undefined })
    );

    expect(() => controller.drainVerificationMessages()).toThrow(NotFoundException);
    expect(() => controller.drainPasswordResetMessages()).toThrow(NotFoundException);
  });
});

describe("isAuthTestSupportEnabled", () => {
  it("requires both NODE_ENV=test and AUTH_TEST_SUPPORT=1", () => {
    expect(isAuthTestSupportEnabled({ NODE_ENV: "test", AUTH_TEST_SUPPORT: "1" })).toBe(true);
    expect(isAuthTestSupportEnabled({ NODE_ENV: "test" })).toBe(false);
    expect(isAuthTestSupportEnabled({ NODE_ENV: "development", AUTH_TEST_SUPPORT: "1" })).toBe(
      false
    );
  });
});

function restoreEnv(): void {
  if (originalNodeEnv === undefined) {
    delete process.env.NODE_ENV;
  } else {
    process.env.NODE_ENV = originalNodeEnv;
  }

  if (originalAuthTestSupport === undefined) {
    delete process.env.AUTH_TEST_SUPPORT;
  } else {
    process.env.AUTH_TEST_SUPPORT = originalAuthTestSupport;
  }
}
