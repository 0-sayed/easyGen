# Explicit API Response Contracts

## Goal

Make the backend's public response shapes visible in code and OpenAPI output instead of relying on TypeScript-only interfaces.

## Scope

- Add explicit response DTO classes or schema metadata for auth responses, current-user responses, health, and status/build-info.
- Keep runtime response payloads backward-compatible with the current frontend clients.
- Ensure Swagger docs expose concrete response properties for `/auth/signup`, `/auth/signin`, `/auth/me`, `/health`, and `/status`.
- Add focused backend tests or OpenAPI JSON assertions where practical.
- Do not change authentication semantics or token contents beyond documenting the existing contract.

## Acceptance Criteria

- `/docs-json` contains concrete schemas or inline property definitions for the changed endpoints.
- Existing auth and status e2e tests continue to pass.
- Frontend API clients do not require behavioral changes.
- The implementation keeps DTOs close to the modules that own the endpoints.
