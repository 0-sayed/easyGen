# Typed Frontend API Client Contracts

## Goal

Reduce frontend API drift by centralizing request, response, and error handling for the web app.

## Scope

- Extract shared API URL resolution, JSON parsing, and error normalization from auth and status clients.
- Preserve current public client functions used by auth and status components:
  `signup()`, `signin()`, `getCurrentUser()`, and `getBuildInfo()`.
- Keep token storage in `session.ts` and token lifecycle updates in
  `AuthProvider`; the shared client must not own token persistence, automatic
  token attachment, or refresh behavior.
- Add typed error categories for validation, unauthorized, conflict, throttled, unavailable, and unexpected responses.
- Represent API failures with an `ApiClientError extends Error` shape carrying
  an `ApiErrorCategory` union of `validation`, `unauthorized`, `conflict`,
  `throttled`, `unavailable`, and `unexpected`.
- Components branch with
  `isApiClientError(error) && error.category === "unauthorized"` instead of
  `instanceof` checks.
- Keep user-facing copy decisions in page/components, not in the low-level API client.
- Add unit coverage for successful responses, API error payloads, malformed payloads, and network failures.

## Acceptance Criteria

- Auth and status clients use one shared fetch/error contract.
- Existing frontend tests continue to pass with no behavior regressions.
- Components can distinguish expected auth errors from infrastructure failures.
- The shared client remains small and framework-local to `apps/web`.
