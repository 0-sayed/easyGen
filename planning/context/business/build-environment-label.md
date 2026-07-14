# Build Environment Label Clarity

## Goal

Make the environment value in the compact build badge self-explanatory.

## Scope

- Prefix the resolved environment value in `BuildInfoBadge` with `env`, followed by one space.
- Preserve the existing live-region semantics, loading and failure states, separators, layout, and styling.
- Add focused component coverage for the visible label.
- Perform browser QA on the public build badge at desktop and mobile widths.
- Do not change backend behavior, dependencies, or unrelated frontend components.
- Update only the `T048` task row and its dedicated Mermaid class entry when marking the task complete.

## Acceptance Criteria

- The resolved badge displays the environment as `env <value>`.
- Existing diagnostics content and announcement behavior remain unchanged.
- Focused frontend tests and the repository validation command pass.
- Browser QA confirms the badge wraps cleanly without overlap or horizontal overflow.
