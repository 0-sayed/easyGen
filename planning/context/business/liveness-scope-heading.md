# Liveness Scope Heading Clarity

## Goal

Make the application status panel explicitly name the liveness scope field in every state.

## Scope

- Change the definition label from `Liveness` to `Liveness scope` in loading, failure, and ready states.
- Preserve the displayed `Process` value, loading and failure states, layout, and styling.
- Add focused component coverage for the visible heading.
- Perform browser QA on the public status panel at desktop and mobile widths.
- Do not change backend behavior, API contracts, dependencies, or unrelated frontend copy.
- Update only the `T050` task row and its dedicated Mermaid class entry when marking the task complete.

## Acceptance Criteria

- Loading, failure, and ready states display the `Liveness scope` label.
- The ready state displays the value `Process`.
- Existing diagnostics content and states remain unchanged.
- Focused frontend tests and the repository validation command pass.
- Browser QA confirms the panel has no overlap or horizontal overflow.
