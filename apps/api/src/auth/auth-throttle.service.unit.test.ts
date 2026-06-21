import { ConfigService } from "@nestjs/config";
import { describe, expect, it } from "vitest";

import { AuthThrottleService } from "./auth-throttle.service";

function createService(config: Record<string, unknown>): AuthThrottleService {
  const configService = {
    get: (key: string, defaultValue: unknown) => config[key] ?? defaultValue,
  } as ConfigService;

  return new AuthThrottleService(configService);
}

function readAttempts(service: AuthThrottleService): Map<string, unknown> {
  return (service as unknown as { attempts: Map<string, unknown> }).attempts;
}

describe("AuthThrottleService", () => {
  it("allows attempts until configured limit is exceeded", () => {
    const service = createService({
      AUTH_THROTTLE_LIMIT: 2,
      AUTH_THROTTLE_WINDOW_MS: 60000,
    });

    expect(
      service.consume({
        scope: "signin",
        email: "Person@Example.com",
        ip: "203.0.113.10",
        now: 1000,
      })
    ).toEqual({ allowed: true });
    expect(
      service.consume({
        scope: "signin",
        email: "person@example.com",
        ip: "203.0.113.10",
        now: 2000,
      })
    ).toEqual({ allowed: true });

    expect(
      service.consume({
        scope: "signin",
        email: "person@example.com",
        ip: "203.0.113.10",
        now: 3000,
      })
    ).toEqual({ allowed: false, retryAfterSeconds: 58 });
  });

  it("starts a new window after configured duration", () => {
    const service = createService({
      AUTH_THROTTLE_LIMIT: "1",
      AUTH_THROTTLE_WINDOW_MS: "1000",
    });

    expect(
      service.consume({
        scope: "signup",
        email: "person@example.com",
        ip: "203.0.113.10",
        now: 1000,
      })
    ).toEqual({ allowed: true });
    expect(
      service.consume({
        scope: "signup",
        email: "person@example.com",
        ip: "203.0.113.10",
        now: 1500,
      })
    ).toEqual({ allowed: false, retryAfterSeconds: 1 });
    expect(
      service.consume({
        scope: "signup",
        email: "person@example.com",
        ip: "203.0.113.10",
        now: 2001,
      })
    ).toEqual({ allowed: true });
  });

  it("blocks repeated attempts from one IP even when emails rotate", () => {
    const service = createService({
      AUTH_THROTTLE_LIMIT: 2,
      AUTH_THROTTLE_WINDOW_MS: 60000,
    });
    const input = {
      scope: "signin" as const,
      ip: "203.0.113.10",
    };

    expect(service.consume({ ...input, email: "first@example.com", now: 1000 })).toEqual({
      allowed: true,
    });
    expect(service.consume({ ...input, email: "second@example.com", now: 2000 })).toEqual({
      allowed: true,
    });
    expect(service.consume({ ...input, email: "third@example.com", now: 3000 })).toEqual({
      allowed: false,
      retryAfterSeconds: 58,
    });
  });

  it("tracks auth windows separately by scope", () => {
    const service = createService({
      AUTH_THROTTLE_LIMIT: 1,
      AUTH_THROTTLE_WINDOW_MS: 60000,
    });
    const input = {
      email: "person@example.com",
      ip: "203.0.113.10",
      now: 1000,
    };

    expect(service.consume({ ...input, scope: "signin" })).toEqual({ allowed: true });
    expect(service.consume({ ...input, scope: "signup" })).toEqual({ allowed: true });
    expect(service.consume({ ...input, scope: "email-verification-request" })).toEqual({
      allowed: true,
    });
    expect(service.consume({ ...input, scope: "email-verification-confirm" })).toEqual({
      allowed: true,
    });
  });

  it("uses a stable fallback IP when request IP is unavailable", () => {
    const service = createService({
      AUTH_THROTTLE_LIMIT: 1,
      AUTH_THROTTLE_WINDOW_MS: 60000,
    });

    expect(
      service.consume({
        scope: "signin",
        email: "person@example.com",
        now: 1000,
      })
    ).toEqual({ allowed: true });
    expect(
      service.consume({
        scope: "signin",
        email: "person@example.com",
        now: 1100,
      })
    ).toEqual({ allowed: false, retryAfterSeconds: 60 });
  });

  it("uses defaults when configured values are invalid strings", () => {
    const service = createService({
      AUTH_THROTTLE_LIMIT: "1.5",
      AUTH_THROTTLE_WINDOW_MS: "5abc",
    });
    const input = {
      scope: "signin" as const,
      email: "person@example.com",
      ip: "203.0.113.10",
    };

    expect(service.consume({ ...input, now: 1000 })).toEqual({ allowed: true });
    expect(service.consume({ ...input, now: 2000 })).toEqual({ allowed: true });
    expect(service.consume({ ...input, now: 3000 })).toEqual({ allowed: true });
    expect(service.consume({ ...input, now: 4000 })).toEqual({ allowed: true });
    expect(service.consume({ ...input, now: 5000 })).toEqual({ allowed: true });
    expect(service.consume({ ...input, now: 6000 })).toEqual({
      allowed: false,
      retryAfterSeconds: 55,
    });
  });

  it("lazily prunes only the accessed expired windows", () => {
    const service = createService({
      AUTH_THROTTLE_LIMIT: 10,
      AUTH_THROTTLE_WINDOW_MS: 1000,
    });
    const attempts = readAttempts(service);

    expect(
      service.consume({
        scope: "signin",
        email: "first@example.com",
        ip: "203.0.113.10",
        now: 1000,
      })
    ).toEqual({ allowed: true });

    expect(
      service.consume({
        scope: "signin",
        email: "second@example.com",
        ip: "203.0.113.10",
        now: 1000,
      })
    ).toEqual({ allowed: true });

    expect(
      service.consume({
        scope: "signin",
        email: "first@example.com",
        ip: "203.0.113.10",
        now: 2001,
      })
    ).toEqual({ allowed: true });

    expect(attempts.size).toBe(3);
    expect(attempts.has("signin:email-ip:second@example.com:203.0.113.10")).toBe(true);
  });

  it("bounds stored throttle state while preserving the active IP window", () => {
    const service = createService({
      AUTH_THROTTLE_LIMIT: 10,
      AUTH_THROTTLE_MAX_ENTRIES: 3,
      AUTH_THROTTLE_WINDOW_MS: 60000,
    });
    const attempts = readAttempts(service);

    for (let index = 0; index < 5; index += 1) {
      expect(
        service.consume({
          scope: "signin",
          email: `person-${String(index)}@example.com`,
          ip: "203.0.113.10",
          now: 1000 + index,
        })
      ).toEqual({ allowed: true });
    }

    expect(attempts.size).toBeLessThanOrEqual(3);
    expect(attempts.has("signin:ip:203.0.113.10")).toBe(true);
  });
});
