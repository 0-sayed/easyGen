# Account Deletion and Data Lifecycle

## Goal

Define and implement a bounded account deletion path with clear authentication and data-retention behavior.

## Scope

- Add a protected account deletion endpoint requiring current-password confirmation.
- Choose and document soft delete, anonymization, or hard delete for the current data model.
- Revoke active sessions after deletion.
- Prevent deleted accounts from signing in or accessing protected endpoints.
- Add tests for deletion, repeated deletion, signin after deletion, and session invalidation.

## Acceptance Criteria

- A signed-in user can delete their own account only after confirming the current password.
- Deleted accounts cannot authenticate.
- Active tokens for deleted accounts are rejected.
- Retention behavior is documented and reflected in tests.
