# Public Diagnostics Contract Matrix

## Goal

Add one browser-level contract check that proves the public diagnostics API and status UI work together.

## Scope

- Add a focused Playwright scenario for the public status surface.
- Start the real EasyGen API and web application through the existing browser-test configuration.
- Assert that the live `GET /health` response has `status: "ok"`, `scope: "process"`, and an integer `uptimeSeconds` value.
- Verify that the rendered process scope and uptime match the live response alongside the service, version, and environment signals.
- Verify the page has no horizontal overflow at desktop and mobile widths.
- Reuse existing browser-test helpers and configuration.
- Do not change production behavior, authentication, dependencies, or unrelated browser scenarios.

## Acceptance Criteria

- The new scenario exercises and validates the real public diagnostics response and UI without authentication.
- Desktop and mobile runs show the build and liveness signals coherently.
- The scenario rejects missing, malformed, or inaccessible diagnostics output.
- Existing browser scenarios remain green.
- Focused browser tests and the repository validation command pass.
