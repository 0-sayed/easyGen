# Ping Purpose Marker

## Goal

Make the existing public ping response state that it represents reachability.

## Scope

- Add `purpose: "reachability"` to the existing `GET /ping` response and OpenAPI contract.
- Update the focused backend coverage.
- Do not change other endpoints, dependencies, or frontend behavior.

## Acceptance Criteria

- `GET /ping` returns `status`, `service`, and `purpose: "reachability"`.
- The OpenAPI schema constrains `purpose` to the literal `"reachability"`.
- Focused backend tests and the repository validation command pass.
- Browser QA is not required.
