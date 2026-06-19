# Public Status Documentation Surface

## Goal

Make the public status endpoint discoverable and consistently documented after the API build-info feature.

## Scope

- Add `/status` to README endpoint documentation and any local runbook references that list public API surfaces.
- Ensure Swagger grouping and descriptions make `/health` and `/status` easy to distinguish.
- Keep the runtime payload compatible with `planning/context/business/api-build-info-status.md`.
- Add focused coverage only if endpoint metadata or docs JSON changes are testable.
- Do not add authentication, database checks, or frontend UI changes in this task.

## Acceptance Criteria

- README lists `/status` with the service, version, and environment payload purpose.
- OpenAPI output describes `/status` as a public build/status endpoint.
- Existing `/health` and `/status` backend tests still pass.
- `git diff --check` passes for changed docs/config.
