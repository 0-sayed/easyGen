# Reviewer-Facing Application Demo Polish

## Goal

Make the signed-in application page feel like a small finished product surface rather than a bare auth success screen.

## Scope

- Improve `/app` with a compact account summary using the existing authenticated user data.
- Surface useful system status information from the existing public status endpoint without making `/app` depend on it.
- Keep the page quiet, professional, and assessment-focused; avoid marketing-style layout.
- Add focused frontend tests and browser QA updates for the changed signed-in surface.
- Only add backend support if the existing `/auth/me` and `/status` contracts cannot support the intended demo.

## Acceptance Criteria

- A reviewer can sign in and immediately understand who is signed in and that the app is connected to the API.
- Logout remains obvious and reliable.
- Status information failures are non-blocking and do not hide the account summary.
- The changed signed-in surface passes focused frontend tests and browser QA.
