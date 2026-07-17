# Sign-In Session Helper Clarity

## Goal

Clarify the existing default session helper on the public sign-in page.

## Scope

- Change the default helper to `Your session stays private on this device.`
- Update the focused component coverage.
- Preserve validation, authentication, layout, styling, and all error states.

## Acceptance Criteria

- The unauthenticated sign-in page displays the new helper text.
- Focused frontend tests and the repository validation command pass.
- Browser QA confirms the sign-in card has no overlap or horizontal overflow.
