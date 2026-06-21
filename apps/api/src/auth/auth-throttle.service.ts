import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export type AuthThrottleScope = "signin" | "signup";

interface AuthThrottleInput {
  scope: AuthThrottleScope;
  email: string;
  ip?: string;
  now?: number;
}

type AuthThrottleResult = { allowed: true } | { allowed: false; retryAfterSeconds: number };

interface ThrottleWindow {
  count: number;
  resetAt: number;
}

@Injectable()
export class AuthThrottleService {
  private readonly attempts = new Map<string, ThrottleWindow>();
  private readonly limit: number;
  private readonly maxEntries: number;
  private readonly windowMs: number;

  constructor(@Inject(ConfigService) private readonly configService: ConfigService) {
    this.limit = this.getPositiveInteger("AUTH_THROTTLE_LIMIT", 5);
    this.maxEntries = Math.max(2, this.getPositiveInteger("AUTH_THROTTLE_MAX_ENTRIES", 10000));
    this.windowMs = this.getPositiveInteger("AUTH_THROTTLE_WINDOW_MS", 60000);
  }

  consume(input: AuthThrottleInput): AuthThrottleResult {
    const now = input.now ?? Date.now();
    const ipResult = this.consumeWindow(this.buildIpKey(input), now);

    if (!ipResult.allowed) {
      return ipResult;
    }

    return this.consumeWindow(this.buildEmailIpKey(input), now);
  }

  private consumeWindow(key: string, now: number): AuthThrottleResult {
    const currentWindow = this.attempts.get(key);

    if (currentWindow === undefined || now >= currentWindow.resetAt) {
      this.setWindow(key, {
        count: 1,
        resetAt: now + this.windowMs,
      });

      return { allowed: true };
    }

    if (currentWindow.count < this.limit) {
      this.setWindow(key, {
        count: currentWindow.count + 1,
        resetAt: currentWindow.resetAt,
      });

      return { allowed: true };
    }

    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((currentWindow.resetAt - now) / 1000)),
    };
  }

  private buildEmailIpKey(input: AuthThrottleInput): string {
    return `${input.scope}:email-ip:${this.normalizeEmail(input)}:${this.normalizeIp(input)}`;
  }

  private buildIpKey(input: AuthThrottleInput): string {
    return `${input.scope}:ip:${this.normalizeIp(input)}`;
  }

  private normalizeEmail(input: AuthThrottleInput): string {
    return input.email.trim().toLowerCase();
  }

  private normalizeIp(input: AuthThrottleInput): string {
    const trimmedIp = input.ip?.trim();
    return trimmedIp === undefined || trimmedIp === "" ? "unknown" : trimmedIp;
  }

  private getPositiveInteger(key: string, defaultValue: number): number {
    const value: unknown = this.configService.get(key, defaultValue);
    const parsed = typeof value === "number" ? value : Number(String(value).trim());

    return Number.isInteger(parsed) && parsed > 0 ? parsed : defaultValue;
  }

  private setWindow(key: string, window: ThrottleWindow): void {
    if (this.attempts.has(key)) {
      this.attempts.delete(key);
    }

    while (this.attempts.size >= this.maxEntries) {
      const oldestKey = this.attempts.keys().next().value;

      if (oldestKey === undefined) {
        break;
      }

      this.attempts.delete(oldestKey);
    }

    this.attempts.set(key, window);
  }
}
