# Email Verification Frontend Flow

## Goal

Let users complete email verification from the browser with clear feedback.

## Scope

- Add a verification result screen for valid, expired, and invalid tokens.
- Connect the screen to the existing email verification API contract.
- Provide a clear path back to sign in or request a new verification email.
- Reuse existing auth UI and validation patterns.

## Acceptance Criteria

- A valid verification link confirms the email and guides the user back to the app.
- Expired or invalid links show actionable recovery copy.
- Loading, success, and failure states are covered by focused frontend tests.
