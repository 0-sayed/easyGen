# Validation Alias README Clarity

## Goal

Make the README state that the Makefile validation shortcut runs the repository validation command.

## Scope

- Add one concise sentence to the README validation section explaining that `make validate` delegates to `pnpm validate`.
- Preserve the existing validation command description and browser QA instructions.
- Do not change application code, dependencies, configuration, or unrelated documentation.
- Update only the `T051` task row and its dedicated Mermaid class entry when marking the task complete.

## Acceptance Criteria

- The README validation section identifies `make validate` as the Makefile alias for `pnpm validate`.
- Existing validation and browser QA documentation remains unchanged.
- Markdown formatting and `git diff --check` pass.
- The repository validation command passes.
