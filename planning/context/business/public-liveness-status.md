# Public Liveness Status

## Goal

Show the API process-liveness contract by extending the existing public build-info surface into a public status surface.

## Scope

- Add a typed frontend client for `GET /health` using the established API client pattern.
- Show loading, healthy, and unavailable liveness states alongside the existing public build information on unauthenticated routes.
- In the healthy state, display the process scope and current uptime in a concise human-readable form.
- Preserve the existing build service, version, and environment information.
- Treat liveness failure as a bounded status-panel failure; do not affect routing or authentication.
- Do not rely on the protected `/app` application status panel for the public flow.
- Add focused automated coverage and perform browser QA at desktop and mobile widths.

## Acceptance Criteria

- The public status surface requests and renders the health contract without authentication.
- A healthy response displays process scope and non-negative uptime without exposing raw diagnostic noise.
- Loading and unavailable states are accessible and do not hide existing build information.
- Existing authentication and protected application behavior remain unchanged.
- Focused tests, repository validation, and desktop/mobile browser QA pass.
