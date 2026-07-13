# Health Uptime Contract

## Goal

Expose process uptime through the public liveness endpoint as a small backend contract change for the Dark Factory reliability qualification.

## Scope

- Add `uptimeSeconds` to the `GET /health` response.
- Return a non-negative integer derived from the current API process uptime.
- Update the response type, Swagger contract, focused endpoint tests, and exact response assertions.
- Preserve the existing `status` and `service` fields.
- Do not access MongoDB, change readiness behavior, add dependencies, or alter authentication.

## Acceptance Criteria

- `GET /health` returns `uptimeSeconds` as a non-negative integer.
- Existing `status: "ok"` and `service: "easygen-api"` values remain unchanged.
- Swagger documents `uptimeSeconds` as a non-negative integer.
- Readiness and build-status endpoints retain their behavior.
- Focused tests and the repository validation command pass.
