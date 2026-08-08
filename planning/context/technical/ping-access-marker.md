# Ping Access Marker

## Goal

Make the public ping response explicitly identify its access level.

## Scope

- Add `access: "public"` to the existing `GET /ping` response and OpenAPI contract.
- Update the focused backend coverage.
- Preserve all existing ping fields and other endpoints.

## Acceptance Criteria

- `GET /ping` returns `access: "public"` with its existing fields.
- The OpenAPI schema constrains `access` to the literal `"public"`.
- Focused backend tests and the repository validation command pass.
- Browser QA is not required.
