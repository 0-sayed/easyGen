# Password Reset Frontend Flow

## Goal

Let users request and complete password reset from the browser.

## Scope

- Add request-reset and set-new-password UI paths.
- Connect the UI to the existing password reset API contract.
- Show success, validation, expired-token, and invalid-token states.
- Keep copy concise and consistent with the existing auth screens.

## Acceptance Criteria

- A user can request a reset email from the signin surface.
- A valid reset token lets the user set a new password.
- Invalid or expired tokens show a recovery path.
- Frontend tests cover success and failure states.
