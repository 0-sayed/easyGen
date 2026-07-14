# Public Shell Browser Smoke Contract

## Goal

Add one independent Playwright smoke scenario for the existing public sign-in shell, exercising browser-test-only QA detection.

## Scope

- Add a new focused Playwright test file under the existing web e2e directory.
- Open the public sign-in route without authentication.
- Assert the existing page heading and public diagnostics landmark are visible.
- Assert the page has no horizontal overflow at desktop and mobile widths.
- Reuse existing Playwright configuration and application behavior.
- Do not change production code, dependencies, authentication, API contracts, or existing browser scenarios.
- Update only the `T045` task row and its dedicated Mermaid class line when marking the task complete.

## Acceptance Criteria

- The new browser smoke scenario passes against the real local API and web application.
- Both desktop and mobile viewports expose the existing public shell and diagnostics without overflow.
- The repository validation command passes.
- The task is recognized as requiring browser QA even though its implementation is a TypeScript browser test only.
