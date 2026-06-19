# Account Profile and Password Change API

## Goal

Add a realistic protected account-management API without turning the assessment into a full settings platform.

## Scope

- Add protected endpoints to read/update account profile fields supported by the current user model.
- Add password change with current-password verification.
- Reuse existing password policy and hashing behavior.
- Return safe public user shapes only.
- If token revocation is available, invalidate other active sessions after password change.

## Acceptance Criteria

- A signed-in user can update allowed profile fields.
- Password change requires the correct current password and the new password must satisfy policy.
- Old passwords stop working after a successful change.
- Responses do not include password hashes, raw tokens, or sensitive internals.
