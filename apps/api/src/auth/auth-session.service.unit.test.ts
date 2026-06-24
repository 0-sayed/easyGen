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

  it("revokes all active sessions for a user", async () => {
    const repository = createRepository();
    const service = new AuthSessionService(repository as AuthSessionRepository);

    await service.revokeActiveSessionsForUser("user-123");

    expect(repository.revokeActiveForUser).toHaveBeenCalledWith("user-123");
  });

  it("rejects other-session revocation payloads without a token id before querying sessions", async () => {
    const repository = createRepository();
    const service = new AuthSessionService(repository as AuthSessionRepository);

    await expect(
      service.revokeOtherSessions({
        email: "person@example.com",
        sub: "user-id",
      } as JwtPayload)
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(repository.revokeOthers).not.toHaveBeenCalled();
  });

  it("revokes active sessions for the same user except the current token", async () => {
    const repository = createRepository();
    const service = new AuthSessionService(repository as AuthSessionRepository);

    await service.revokeOtherSessions({
      email: "person@example.com",
      jti: "current-token-id",
      sub: "user-id",
    });

    expect(repository.revokeOthers).toHaveBeenCalledWith({
      exceptTokenId: "current-token-id",
      userId: "user-id",
    });
  });
});

function createRepository(
  overrides: Partial<
    Pick<AuthSessionRepository, "existsActive" | "revoke" | "revokeActiveForUser" | "revokeOthers">
  > = {}
): Pick<
  AuthSessionRepository,
  "create" | "existsActive" | "revoke" | "revokeActiveForUser" | "revokeOthers"
> {
  return {
    create: vi.fn(),
    existsActive: vi.fn(() => Promise.resolve(false)),
    revoke: vi.fn(() => Promise.resolve()),
    revokeActiveForUser: vi.fn(() => Promise.resolve()),
    revokeOthers: vi.fn(() => Promise.resolve()),
    ...overrides,
  };
}
