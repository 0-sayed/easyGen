# Ping Transport Marker

## Goal

Make the public ping response state that it is served over HTTP.

## Scope

- Add `transport: "http"` to the existing `GET /ping` response and OpenAPI contract.
- Update the focused backend coverage.
- Do not change other endpoints, dependencies, or frontend behavior.

## Acceptance Criteria

- `GET /ping` returns `transport: "http"` with its existing fields.
- The OpenAPI schema constrains `transport` to the literal `"http"`.
- Focused backend tests and the repository validation command pass.
- Browser QA is not required.
