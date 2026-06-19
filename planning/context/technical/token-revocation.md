# Backend Token Revocation and Logout API

## Goal

Move logout from a frontend-only token deletion into a backend-enforced session lifecycle.

## Scope

- Add a protected logout endpoint that revokes the current access token or session identifier.
- Add the minimum persistence needed to reject revoked tokens on protected endpoints.
- Keep token payloads and expiry behavior compatible with existing signin/signup clients unless the new revocation design requires a narrow additive field.
- Ensure password-change and future account lifecycle tasks can invalidate active sessions.
- Add backend e2e coverage for signin, protected access, logout, and rejected reuse of a revoked token.

## Acceptance Criteria

- A token that was accepted before logout is rejected after logout.
- Existing signup, signin, and `/auth/me` success paths still work.
- Revocation storage has clear indexes or cleanup behavior.
- Logs and responses never expose raw token values.
