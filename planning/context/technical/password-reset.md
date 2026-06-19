# Password Reset Token Flow

## Goal

Add a secure forgotten-password flow that is at least as carefully tested as signin.

## Scope

- Add request and confirm endpoints for password reset.
- Use expiring, single-use reset tokens stored safely at rest.
- Avoid account enumeration in request responses and timing-sensitive behavior where practical.
- Reuse password policy and hashing rules for the new password.
- Keep email delivery local/test-friendly through the same abstraction used for verification.

## Acceptance Criteria

- A user can complete password reset with a valid token and then sign in with the new password.
- Expired, reused, malformed, and wrong-account tokens fail safely.
- Request responses do not reveal whether an email exists.
- Existing signin/signup behavior is unchanged.
