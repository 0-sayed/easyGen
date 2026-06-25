# Account Lifecycle Browser QA Slice

## Goal

Add browser-level confidence for account settings, activity, and deletion flows.

## Scope

- Cover the account settings happy path at browser level.
- Cover account activity visibility where supported by the API.
- Cover account deletion confirmation and post-delete routing.
- Keep data setup deterministic for repeated local and CI runs.

## Acceptance Criteria

- Browser QA covers one successful account settings flow.
- Browser QA covers account deletion confirmation and post-delete unauthenticated state.
- Tests remain focused and do not duplicate the full auth QA matrix.
