# Public API Ping Contract

## Goal

Add a minimal public ping endpoint for lightweight API reachability checks.

## Scope

- Add `GET /ping` to the root API controller.
- Return the stable JSON response `{ "status": "ok" }`.
- Document the endpoint in OpenAPI and add focused end-to-end coverage using an unauthenticated request.
- Do not change existing health, readiness, status, authentication, or frontend behavior.
- Update only the `T046` task row and its dedicated Mermaid class entry when marking the task complete.

## Acceptance Criteria

- An unauthenticated `GET /ping` request returns HTTP 200 with exactly `{ "status": "ok" }`.
- OpenAPI exposes the public ping operation and response contract.
- Focused backend tests and the repository validation command pass.
- Browser QA is not required because the task changes no browser-facing behavior.
