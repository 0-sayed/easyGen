# Sign-Up Password Visibility

## Goal

Let users reveal and hide the password they are entering during account creation.

## Scope

- Add a show/hide password control to the sign-up password field.
- Keep the password masked by default.
- Preserve the entered value and prevent the control from submitting the form.
- Reuse the established sign-in password-control styling and interaction pattern.
- Do not change validation, submission behavior, authentication contracts, or dependencies.
- Add focused automated coverage and perform browser QA at desktop and mobile widths.

## Acceptance Criteria

- The sign-up password starts masked and can be revealed and hidden repeatedly.
- The control has an accurate accessible name in both states.
- Toggling visibility preserves the value and does not submit the form.
- Existing sign-up validation and submission behavior remain unchanged.
- Focused tests, repository validation, and desktop/mobile browser QA pass.
