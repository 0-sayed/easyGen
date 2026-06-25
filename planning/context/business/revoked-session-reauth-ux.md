# Revoked-Session Reauth UX

## Goal

Handle revoked or expired sessions without leaving users on a broken protected page.

## Scope

- Detect API responses that mean the current session is no longer valid.
- Clear stale client auth state and route the user to sign in.
- Show one concise message explaining that signin is required again.
- Avoid broad session-management rewrites.

## Acceptance Criteria

- Protected pages recover cleanly from a revoked session response.
- The user sees a clear reauth message instead of a generic failure.
- Existing signin flow still works after stale state is cleared.
- Focused frontend tests cover revoked-session recovery and normal signin recovery.
