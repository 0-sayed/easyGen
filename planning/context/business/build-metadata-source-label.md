# Build Metadata Source Label

## Goal

Show that the public build metadata comes from the running API.

## Scope

- Add `source: "runtime"` to the existing `GET /status` response and OpenAPI contract.
- Validate the new field in the frontend status client.
- Display `Source` with the value `Runtime` in the existing application status panel.
- Update focused backend and frontend coverage without changing unrelated status behavior.

## Acceptance Criteria

- `GET /status` returns `source: "runtime"` with its existing fields.
- The application status panel displays `Source` and `Runtime` when status data is ready.
- Focused backend and frontend tests plus the repository validation command pass.
- Browser QA confirms the status panel has no overlap or horizontal overflow.
