# Reset Password Visibility

## Goal

Let users verify both password entries before submitting the reset-password form.

## Scope

- Add one show/hide control that toggles both new-password fields together.
- Keep both fields masked by default.
- Preserve both entered values and prevent the control from submitting the form.
- Reuse the established password-control styling where practical.
- Do not change token validation, reset submission, API contracts, or dependencies.
- Add focused automated coverage and perform browser QA at desktop and mobile widths.

## Acceptance Criteria

- Both reset-password fields start masked and toggle together.
- The control has an accurate accessible name in both states.
- Toggling visibility preserves both values and does not submit the form.
- Invalid-link and successful-reset behavior remain unchanged.
- Focused tests, repository validation, and desktop/mobile browser QA pass.
