# Account Activity Frontend

## Goal

Show users a simple recent account activity view inside the protected app.

## Scope

- Add a protected account activity page or section.
- Render the safe activity events exposed by the backend.
- Handle empty, loading, error, and success states.
- Keep timestamps readable and avoid exposing raw technical identifiers.
- Add focused tests for rendering and error states.

## Acceptance Criteria

- A signed-in user can see recent account activity after signin.
- The UI does not show events for other users.
- Empty and failed activity loads are handled without breaking the app page.
- Logout and navigation remain intact.
