# Build Environment Badge Label

## Goal

Spell out the environment label in the existing public build information badge.

## Scope

- Change the ready-state badge text from `env <value>` to `environment <value>`.
- Update the focused component coverage.
- Preserve layout, styling, loading, failure, API, and backend behavior.

## Acceptance Criteria

- The ready badge displays `environment <value>`.
- Focused frontend tests and the repository validation command pass.
- Browser QA confirms the public badge has no overlap or horizontal overflow.
