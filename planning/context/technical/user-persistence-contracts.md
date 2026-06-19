# User Persistence Contract Coverage

## Goal

Lock down the MongoDB user persistence behaviors that auth security depends on.

## Scope

- Add repository or integration-level coverage for email normalization, unique email enforcement, and public-user projection.
- Verify password hashes are not returned by public lookup methods.
- Cover duplicate email behavior at the persistence boundary, not only through auth e2e tests.
- If the existing schema index behavior is insufficiently explicit, add a migration for the unique email index.
- Do not change public API responses unless a test exposes a real contract bug.

## Acceptance Criteria

- Tests prove duplicate emails cannot create two users.
- Tests prove public user reads exclude `passwordHash`.
- Tests prove stored email lookup behavior matches signin/signup expectations.
- New migration code, if added, is documented and runs through the existing migrate-mongo tooling.
