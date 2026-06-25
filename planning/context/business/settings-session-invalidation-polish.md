# Settings Session Invalidation Polish

## Goal

Make account settings behave cleanly when profile or password changes affect the active session.

## Scope

- Keep the current tab usable after a successful password change.
- Treat stale sessions in other tabs or later API calls as revoked-session reauth using the `T026` behavior.
- Preserve clear success and recovery messaging.
- Keep account settings forms usable after validation failures.
- Avoid changing backend session invalidation rules unless the existing API contract requires it.

## Acceptance Criteria

- Password or security-sensitive changes result in a clear next step.
- The UI does not keep stale authenticated state after invalidation.
- Validation errors remain inline and recoverable.
- Focused frontend tests cover success, validation failure, and stale-session recovery behavior.
