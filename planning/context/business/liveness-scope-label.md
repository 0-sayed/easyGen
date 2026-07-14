# Liveness Scope Label Polish

## Goal

Present the API liveness scope as readable interface copy in the application status panel.

## Scope

- Display the existing `process` scope value as `Process` in `ApplicationStatusPanel`.
- Preserve API contracts, loading and failure states, layout, and styling.
- Add focused component coverage for the visible label.
- Perform browser QA on the public status panel at desktop and mobile widths.
- Do not change backend behavior, dependencies, or unrelated frontend components.
- Update only the `T047` task row and its dedicated Mermaid class entry when marking the task complete.

## Acceptance Criteria

- The ready status panel displays `Process` for the process liveness scope.
- Existing diagnostics content and states remain unchanged.
- Focused frontend tests and the repository validation command pass.
- Browser QA confirms the panel has no overlap or horizontal overflow.
