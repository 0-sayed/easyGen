# Account Settings Frontend

## Goal

Give signed-in users a small settings surface for profile and password management.

## Scope

- Add account settings UI reachable from the protected application page.
- Support profile update fields exposed by the account API.
- Support password change with current password, new password, and confirmation fields.
- Show validation and API errors using existing auth UI patterns.
- Keep settings focused; do not add preferences, billing, teams, or admin behavior.

## Acceptance Criteria

- A signed-in user can update supported profile fields from the browser.
- A signed-in user can change password and receive clear success/failure feedback.
- Validation matches the backend password policy.
- Browser-visible behavior is covered by focused frontend tests and, where useful, Playwright QA.
