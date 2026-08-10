# Service Status Loading Clarity

## Goal

Clarify the build badge loading message.

## Scope

- Change the build badge loading message from `Checking API status...` to `Checking service status...`.
- Update the focused component coverage.
- Preserve the live-region behavior and resolved status content.

## Acceptance Criteria

- The build badge displays the new message while status information loads.
- Focused frontend tests and the repository validation command pass.
- Browser QA confirms the loading message has no overlap or horizontal overflow.
