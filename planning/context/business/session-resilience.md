# Frontend Session Resilience

## Goal

Make the frontend handle session and API connectivity edge cases clearly without blocking the core auth flow.

## Scope

- Show a non-blocking API status failure state when `/status` cannot be loaded.
- Keep signin and signup usable when the status badge request fails.
- Make expired, invalid, or missing stored tokens recover cleanly by clearing local auth state and returning the user to signin.
- Preserve the current localStorage-based token model unless a later task changes the auth architecture.
- Add focused frontend tests for status failure, stale token recovery, and successful session restoration.

## Acceptance Criteria

- A failed `/status` request is visible enough for QA but does not prevent authentication.
- A stale token is cleared after `/auth/me` rejects it.
- A valid stored token restores the signed-in user without requiring a fresh signin.
- Focused frontend unit tests cover the changed states.
