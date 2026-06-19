# API Build Info Status

## Goal

Add a small public status feature that proves the backend and frontend can share a new non-authenticated API surface.

## Scope

- Add a public backend endpoint that returns build information for this running service.
- Expose at least:
  - `service`: `easygen-api`
  - `version`: package version from the API package metadata or a stable fallback.
  - `environment`: the configured runtime environment.
- Add focused backend coverage for the endpoint.
- Add frontend API client support for reading the build information.
- Show the build information somewhere visible in the unauthenticated frontend flow without blocking signin or signup.
- Add focused frontend coverage for the rendered build information.

## Acceptance Criteria

- A user can open the web app while signed out and see the API service name, version, and environment.
- The endpoint is public and does not require a JWT.
- Existing auth behavior is unchanged.
- The smallest relevant local validation for changed backend and frontend code passes.
