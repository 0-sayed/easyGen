# Health Service Identity

## Goal

Make the public liveness response identify the service being checked while preserving its minimal contract.

## Scope

- Add the stable service identifier `easygen-api` to the `GET /health` response.
- Update the response type and generated OpenAPI contract exposed by the application.
- Update the README endpoint documentation to show the new response shape.
- Update focused endpoint and contract coverage.
- Do not change readiness checks, build-status behavior, authentication, or database access.

## Acceptance Criteria

- `GET /health` returns exactly `{ "status": "ok", "service": "easygen-api" }`.
- OpenAPI documents the service field as the stable `easygen-api` value.
- The README documents the same health response contract.
- Existing readiness and status endpoints retain their current behavior.
- Focused tests and repository validation pass.
