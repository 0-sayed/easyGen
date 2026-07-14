# API Port Boundary Contract Coverage

## Goal

Strengthen the backend-only contract coverage for configurable API ports without changing browser behavior.

## Scope

- Extend the focused `resolvePort` unit tests with boundary and whitespace cases.
- Cover the minimum valid port, maximum valid port, zero, and a value above the maximum.
- Confirm surrounding whitespace on an otherwise valid configured port remains accepted.
- Change production code only if a new behavioral test exposes a genuine contract defect.
- Do not change frontend files, dependencies, environment defaults, Docker configuration, or unrelated tests.
- Update only the `T043` task row and its dedicated Mermaid class line when marking the task complete.

## Acceptance Criteria

- Valid boundary ports resolve exactly.
- Invalid boundary ports fail with the existing configuration error contract.
- The focused API configuration tests pass.
- The repository validation command passes.
- Browser QA is not required because the task changes no browser-facing behavior.
