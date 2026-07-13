# Sign-In Password Visibility

## Goal

Give users an accessible way to reveal and hide the password they entered on the sign-in page.

## Scope

- Add a show/hide password control to the sign-in password field only.
- Keep the password masked by default.
- Preserve the entered value and prevent the control from submitting the form.
- Do not change authentication behavior, validation rules, API contracts, or dependencies.
- Add focused automated coverage for the interaction.
- Perform browser QA for the sign-in page at desktop and mobile widths.

## Acceptance Criteria

- The password starts masked and can be revealed and hidden repeatedly.
- The control has an accurate accessible name in both states.
- Toggling visibility preserves the password value and does not submit the form.
- Focused tests and repository validation pass.
- Browser QA confirms the control is usable and does not overlap surrounding content at desktop and mobile widths.
