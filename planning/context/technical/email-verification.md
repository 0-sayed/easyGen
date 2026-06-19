# Email Verification Token Flow

## Goal

Add a secure account verification path that proves the app can handle token lifecycle beyond signin.

## Scope

- Mark users as verified or unverified in persistence.
- Generate verification tokens with expiration and single-use behavior.
- Add request and confirm endpoints for email verification.
- Use a local/test-friendly delivery abstraction; do not require a real email provider for local validation.
- Keep responses safe against account enumeration.

## Acceptance Criteria

- A newly created account can request and complete verification through token-based endpoints.
- Expired, reused, malformed, and wrong-account tokens are rejected.
- Verification tokens are stored hashed or otherwise protected at rest.
- Backend tests cover success and failure cases without sending real email.
