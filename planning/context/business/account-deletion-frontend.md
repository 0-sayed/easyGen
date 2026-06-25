# Account Deletion Frontend Confirmation

## Goal

Expose account deletion in the UI with deliberate confirmation and safe feedback.

## Scope

- Add an account deletion action to the account/settings area.
- Require explicit confirmation before calling the deletion API.
- Show success and failure states using existing UI patterns.
- Route the user out of the authenticated area after successful deletion.

## Acceptance Criteria

- A signed-in user can delete the account only after confirmation.
- API errors are visible and do not leave the UI in a stuck state.
- Successful deletion clears auth state and returns the user to a public route.
- Focused frontend tests cover confirmation, cancellation, success, and API failure states.
