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
  private readonly windowMs: number;

  constructor(@Inject(ConfigService) private readonly configService: ConfigService) {
    this.limit = this.getPositiveInteger("AUTH_THROTTLE_LIMIT", 5);
    this.windowMs = this.getPositiveInteger("AUTH_THROTTLE_WINDOW_MS", 60000);
  }

  consume(input: AuthThrottleInput): AuthThrottleResult {
    const now = input.now ?? Date.now();

    this.pruneExpiredWindows(now);

    const key = this.buildKey(input);
    const currentWindow = this.attempts.get(key);

    if (currentWindow === undefined || now >= currentWindow.resetAt) {
      this.attempts.set(key, {
        count: 1,
        resetAt: now + this.windowMs,
      });

      return { allowed: true };
    }

    if (currentWindow.count < this.limit) {
      currentWindow.count += 1;
      return { allowed: true };
    }

    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((currentWindow.resetAt - now) / 1000)),
    };
  }

  private buildKey(input: AuthThrottleInput): string {
    const email = input.email.trim().toLowerCase();
    const trimmedIp = input.ip?.trim();
    const ip = trimmedIp === undefined || trimmedIp === "" ? "unknown" : trimmedIp;

    return `${input.scope}:${email}:${ip}`;
  }

  private getPositiveInteger(key: string, defaultValue: number): number {
    const value: unknown = this.configService.get(key, defaultValue);
    const parsed = typeof value === "number" ? value : Number(String(value).trim());

    return Number.isInteger(parsed) && parsed > 0 ? parsed : defaultValue;
  }

  private pruneExpiredWindows(now: number): void {
    for (const [key, window] of this.attempts) {
      if (now >= window.resetAt) {
        this.attempts.delete(key);
      }
    }
  }
}
