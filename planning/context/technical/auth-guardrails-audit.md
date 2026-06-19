# Auth Abuse Guardrails and Audit Trail

## Goal

Add practical production-readiness around public auth endpoints without making the assessment app heavy.

## Scope

- Add rate limiting or throttling for signup and signin attempts.
- Return a clear but safe response for throttled requests.
- Add structured audit logging for important auth events such as signup success, signin success, signin failure, and token/user lookup failure.
- Keep logs free of passwords, tokens, and credential-bearing values.
- Add focused backend tests for throttling behavior and audit-log-safe event payloads where practical.

## Acceptance Criteria

- Repeated auth attempts can be throttled deterministically in tests.
- Auth failure responses do not reveal whether an email exists.
- Audit events include useful correlation context without leaking secrets.
- Existing successful signup, signin, and `/auth/me` behavior remains compatible.
