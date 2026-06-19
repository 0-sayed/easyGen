# User-Facing Account Activity API

## Goal

Expose a safe, protected account activity read model from audit events.

## Scope

- Select a small set of user-safe activity events such as signup, signin, logout, password change, password reset, and email verification.
- Add a protected endpoint for the current user's recent activity.
- Exclude secrets, tokens, raw IP addresses if not needed, and internal-only audit fields.
- Add pagination or a small fixed limit to keep the endpoint bounded.
- Add backend tests for ownership isolation and event shape.

## Acceptance Criteria

- A signed-in user can fetch only their own recent account activity.
- Activity entries are useful to a user but do not leak sensitive implementation details.
- The endpoint is protected by the existing auth guard.
- Audit/internal events that are not user-safe remain hidden.
