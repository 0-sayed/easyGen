# Live Diagnostics Announcement Semantics

## Goal

Make resolved API build and liveness information announce politely to assistive technology when asynchronous diagnostics finish loading.

## Scope

- Add the appropriate live-region semantics to the resolved diagnostics container in `BuildInfoBadge`.
- Preserve the existing visible copy, layout, API requests, loading state, failure state, and responsive behavior.
- Add focused component coverage for the resulting accessibility contract.
- Perform browser QA on the public sign-in diagnostics surface at desktop and mobile widths.
- Do not change backend behavior, dependencies, styling, or unrelated frontend components.
- Update only the `T044` task row and its dedicated Mermaid class line when marking the task complete.

## Acceptance Criteria

- Resolved build and liveness information uses a polite live region.
- Existing loading, success, and failure content remains unchanged.
- Focused frontend tests and the repository validation command pass.
- Browser QA confirms the diagnostics remain visible without overlap or horizontal overflow at desktop and mobile widths.
