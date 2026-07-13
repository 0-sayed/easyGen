# Public Diagnostics Documentation

## Goal

Keep operator-facing documentation synchronized with the qualified public diagnostics contracts.

## Scope

- Update the README `GET /health` example to include `scope` and `uptimeSeconds`.
- Explain that uptime is process-local and resets when the API process restarts.
- Preserve the distinction between liveness (`GET /health`) and dependency readiness (`GET /ready`).
- Do not change application code, dependencies, setup commands, or unrelated documentation.

## Acceptance Criteria

- The documented health response matches the implemented response shape.
- The process-local meaning of `uptimeSeconds` is explicit.
- The liveness/readiness distinction remains concise and accurate.
- Markdown formatting, `git diff --check`, and the repository validation command pass.
