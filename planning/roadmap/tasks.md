# Tasks

Roadmap for the full-stack authentication assessment.

Context:

- `planning/context/business/task.md`
- `planning/context/technical/bootstrap.md`
- `planning/context/technical/tech-stack.md`

## Task Graph

| Done | Task                                     | Depends On     | Branch                             | Context                                                                                                                    |
| ---- | ---------------------------------------- | -------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| [x]  | `T001` — Bootstrap project foundation    | —              | `chore/t001-bootstrap-foundation`  | `planning/context/technical/bootstrap.md`, `planning/context/technical/tech-stack.md`                                      |
| [ ]  | `T002` — Backend auth API                | `T001`         | `feat/t002-backend-auth-api`       | `planning/context/business/task.md`, `planning/context/technical/tech-stack.md`                                            |
| [ ]  | `T003` — Frontend auth flow and delivery | `T001`, `T002` | `feat/t003-frontend-auth-delivery` | `planning/context/business/task.md`, `planning/context/technical/bootstrap.md`, `planning/context/technical/tech-stack.md` |

## Execution Waves

| Wave | Done | Parallel Tasks | Branches                           |
| ---- | ---- | -------------- | ---------------------------------- |
| 1    | [x]  | `T001`         | `chore/t001-bootstrap-foundation`  |
| 2    | [ ]  | `T002`         | `feat/t002-backend-auth-api`       |
| 3    | [ ]  | `T003`         | `feat/t003-frontend-auth-delivery` |
