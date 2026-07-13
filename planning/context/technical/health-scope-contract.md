# Health Scope Contract

## Goal

Make the public liveness response explicitly state that it reports process health rather than dependency readiness.

## Scope

- Add the stable field `scope: "process"` to the `GET /health` response.
- Update the response type, Swagger contract, focused endpoint tests, and exact response assertions.
- Preserve all existing health response fields.
- Do not change `GET /ready`, database access, authentication, dependencies, or runtime configuration.

## Acceptance Criteria

- `GET /health` returns `scope: "process"`.
- Existing health response values remain present and unchanged.
- Swagger documents `scope` as the stable value `process`.
- `GET /ready` remains the only public dependency-readiness endpoint.
- Focused tests and the repository validation command pass.
