# Auth Recovery Browser QA Slice

## Goal

Add browser-level confidence for verification and password reset recovery paths.

## Scope

- Cover email verification success and invalid-token behavior.
- Cover password reset request and set-new-password behavior.
- Use deterministic test data and isolated local services.
- Keep this slice focused on recovery paths, not the whole auth matrix.

## Acceptance Criteria

- Browser QA exercises at least one successful recovery path.
- Browser QA exercises at least one invalid or expired token path.
- Failures produce actionable messages for routing, API, or session regressions.
