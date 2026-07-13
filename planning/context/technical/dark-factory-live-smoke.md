# Dark Factory Live Smoke

## Goal

Exercise the complete Dark Factory, Go AO, Archon, GitHub PR, merge, and cleanup lifecycle with a harmless documentation-only change.

## Scope

- Treat this planning context as the specification and create `docs/dark-factory-live-smoke.md` as the delivered smoke marker.
- Give the document the heading `Dark Factory Live Smoke`.
- State that the marker was produced through the Dark Factory-controlled delivery pipeline.
- Do not change application code, dependencies, configuration, or runtime behavior.

## Acceptance Criteria

- The smoke document exists and contains the required heading and pipeline statement.
- Repository formatting and validation requirements pass.
- The Go AO session records an external Archon worker for `T031`.
- Archon completes the feature workflow and opens the task pull request.
- Dark Factory observes the green pull request, finalizes its merge, and reconciles `T031` as complete.
- Dark Factory cleanup removes the managed task worktree without affecting unrelated repository resources.
