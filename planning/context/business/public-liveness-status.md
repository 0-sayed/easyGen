# Public Liveness Status

## Goal

Show the API process-liveness contract on the existing public status panel.

## Scope

- Add a typed frontend client for `GET /health` using the established API client pattern.
- Show loading, healthy, and unavailable liveness states in the existing status panel.
- In the healthy state, display the process scope and current uptime in a concise human-readable form.
- Preserve the existing build service, version, and environment information.
- Treat liveness failure as a bounded status-panel failure; do not affect routing or authentication.
- Add focused automated coverage and perform browser QA at desktop and mobile widths.

## Acceptance Criteria

- The status panel requests and renders the public health contract.
- A healthy response displays process scope and non-negative uptime without exposing raw diagnostic noise.
- Loading and unavailable states are accessible and do not hide existing build information.
- Existing authentication and protected application behavior remain unchanged.
- Focused tests, repository validation, and desktop/mobile browser QA pass.
