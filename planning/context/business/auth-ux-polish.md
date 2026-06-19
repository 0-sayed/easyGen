# Application Copy and Route Polish

## Goal

Tighten the browser-visible auth experience so it matches the original assessment requirements and feels deliberate during edge states.

## Scope

- Update the protected application page heading to match the required welcome message: `Welcome to the application.`
- Preserve the signed-in user's visible identity and logout flow.
- Replace the bare protected-route loading text with styled loading UI that fits the existing auth page system.
- Add a simple not-found route instead of redirecting every unknown route to signin.
- Update focused route, page, and browser smoke coverage for changed copy and routing behavior.

## Acceptance Criteria

- A signed-in user sees `Welcome to the application.` on `/app`.
- Unknown routes show a clear not-found state with a path back to signin or the app.
- Protected-route loading remains accessible and does not flash incorrect auth state.
- Existing signup, signin, logout, and protected-route behavior still passes focused frontend tests.
