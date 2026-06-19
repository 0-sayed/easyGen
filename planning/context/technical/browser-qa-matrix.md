# Full-Stack Browser QA Matrix

## Goal

Expand browser confidence from one happy path into a compact matrix that catches common auth regressions.

## Scope

- Cover signup, logout, signin, protected-route redirect, duplicate signup, failed signin, and stale-session recovery.
- Use stable test data generation so repeated local and CI runs do not collide.
- Keep tests focused on browser-visible behavior rather than backend implementation details.
- Document required local services and app URLs for running the matrix.
- Avoid adding broad visual or cross-browser coverage unless the changed app surface requires it.

## Acceptance Criteria

- Playwright coverage includes at least one success path and at least three negative or edge auth paths.
- Tests are deterministic across repeated runs against an isolated local MongoDB.
- Browser tests fail with actionable messages when API, routing, or session behavior regresses.
- README or test comments explain the minimum services needed to run the matrix.
