import { UnauthorizedException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import { AuthSessionRepository } from "./auth-session.repository";
import { AuthSessionService } from "./auth-session.service";
import type { JwtPayload } from "./jwt-payload";

describe("AuthSessionService", () => {
  it("declares its repository dependency for runtime injection", () => {
    expect(Reflect.getMetadata("self:paramtypes", AuthSessionService)).toEqual([
      { index: 0, param: AuthSessionRepository },
    ]);
  });

  it("rejects legacy payloads without a token id before querying sessions", async () => {
    const repository = createRepository({ existsActive: vi.fn(() => Promise.resolve(true)) });
    const service = new AuthSessionService(repository as AuthSessionRepository);

    await expect(
      service.assertActive({
        email: "person@example.com",
        sub: "user-id",
      } as JwtPayload)
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(repository.existsActive).not.toHaveBeenCalled();
  });

  it("rejects logout payloads without a token id before revoking sessions", async () => {
    const repository = createRepository();
    const service = new AuthSessionService(repository as AuthSessionRepository);

    await expect(
      service.revokeCurrentSession({
        email: "person@example.com",
        sub: "user-id",
      } as JwtPayload)
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(repository.revoke).not.toHaveBeenCalled();
  });
});

function createRepository(
  overrides: Partial<Pick<AuthSessionRepository, "existsActive" | "revoke">> = {}
): Pick<AuthSessionRepository, "create" | "existsActive" | "revoke"> {
  return {
    create: vi.fn(),
    existsActive: vi.fn(() => Promise.resolve(false)),
    revoke: vi.fn(() => Promise.resolve()),
    ...overrides,
  };
}
