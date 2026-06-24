# Tasks

Roadmap for the full-stack authentication assessment.

Context:

- `planning/context/business/task.md`
- `planning/context/technical/bootstrap.md`
- `planning/context/technical/tech-stack.md`

Sizing:

- `S` — narrow docs, UI, or test polish that should fit in one focused branch.
- `M` — one subsystem or one cross-stack contract with focused tests.
- `L` — broader production-readiness work that may touch several files but still has a clear feature boundary.

## Task Graph

| Done | Size | Task                                             | Depends On             | Branch                                 | Context                                                                                                                    |
| ---- | ---- | ------------------------------------------------ | ---------------------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| [x]  | L    | `T001` — Bootstrap project foundation            | —                      | `chore/t001-bootstrap-foundation`      | `planning/context/technical/bootstrap.md`, `planning/context/technical/tech-stack.md`                                      |
| [x]  | M    | `T002` — Backend auth API                        | `T001`                 | `feat/t002-backend-auth-api`           | `planning/context/business/task.md`, `planning/context/technical/tech-stack.md`                                            |
| [x]  | M    | `T003` — Frontend auth flow and delivery         | `T001`, `T002`         | `feat/t003-frontend-auth-delivery`     | `planning/context/business/task.md`, `planning/context/technical/bootstrap.md`, `planning/context/technical/tech-stack.md` |
| [x]  | S    | `T004` — API build info status                   | `T001`                 | `feat/t004-api-build-info-status`      | `planning/context/business/api-build-info-status.md`, `planning/context/technical/tech-stack.md`                           |
| [x]  | S    | `T005` — Public status documentation surface     | `T004`                 | `feat/t005-public-status-contract`     | `planning/context/technical/public-status-contract.md`                                                                     |
| [ ]  | S    | `T006` — Submission readiness pass               | `T021`, `T022`, `T023` | `chore/t006-submission-readiness`      | `planning/context/business/submission-readiness.md`                                                                        |
| [x]  | S    | `T007` — Application copy and route polish       | `T003`                 | `feat/t007-auth-ux-polish`             | `planning/context/business/auth-ux-polish.md`                                                                              |
| [x]  | M    | `T008` — Explicit API response contracts         | `T002`, `T004`         | `feat/t008-api-response-contracts`     | `planning/context/technical/api-response-contracts.md`                                                                     |
| [x]  | M    | `T009` — Frontend session resilience             | `T003`, `T004`         | `feat/t009-session-resilience`         | `planning/context/business/session-resilience.md`                                                                          |
| [x]  | M    | `T010` — User persistence contract coverage      | `T002`                 | `test/t010-user-persistence-contracts` | `planning/context/technical/user-persistence-contracts.md`                                                                 |
| [x]  | L    | `T011` — Config and deployment readiness         | `T008`                 | `chore/t011-deployment-readiness`      | `planning/context/technical/deployment-readiness.md`                                                                       |
| [x]  | L    | `T012` — Auth abuse guardrails and audit trail   | `T008`, `T010`         | `feat/t012-auth-guardrails-audit`      | `planning/context/technical/auth-guardrails-audit.md`                                                                      |
| [x]  | L    | `T013` — Full-stack browser QA matrix            | `T007`, `T009`         | `test/t013-browser-qa-matrix`          | `planning/context/technical/browser-qa-matrix.md`                                                                          |
| [x]  | L    | `T014` — Reviewer-facing application demo polish | `T007`, `T009`         | `feat/t014-reviewer-demo-polish`       | `planning/context/business/reviewer-demo-polish.md`                                                                        |
| [x]  | L    | `T015` — Backend token revocation and logout API | `T008`, `T011`, `T012` | `feat/t015-token-revocation-logout`    | `planning/context/technical/token-revocation.md`                                                                           |
| [x]  | L    | `T016` — Email verification token flow           | `T010`, `T011`, `T012` | `feat/t016-email-verification-flow`    | `planning/context/technical/email-verification.md`                                                                         |
| [x]  | M    | `T017` — Typed frontend API client contracts     | `T008`, `T009`         | `feat/t017-typed-frontend-api-client`  | `planning/context/technical/frontend-api-client-contract.md`                                                               |
| [ ]  | M    | `T018` — Account profile and password change API | `T010`, `T015`         | `feat/t018-account-security-api`       | `planning/context/technical/account-security-api.md`                                                                       |
| [ ]  | L    | `T019` — Password reset token flow               | `T015`, `T016`         | `feat/t019-password-reset-flow`        | `planning/context/technical/password-reset.md`                                                                             |
| [ ]  | M    | `T020` — User-facing account activity API        | `T012`, `T015`         | `feat/t020-account-activity-api`       | `planning/context/technical/account-activity-api.md`                                                                       |
| [ ]  | M    | `T021` — Account settings frontend               | `T017`, `T018`         | `feat/t021-account-settings-frontend`  | `planning/context/business/account-settings-frontend.md`                                                                   |
| [ ]  | M    | `T022` — Account activity frontend               | `T017`, `T020`         | `feat/t022-account-activity-frontend`  | `planning/context/business/account-activity-frontend.md`                                                                   |
| [ ]  | L    | `T023` — Account deletion and data lifecycle     | `T015`, `T018`         | `feat/t023-account-data-lifecycle`     | `planning/context/technical/account-data-lifecycle.md`                                                                     |

## Execution Waves

| Wave | Done | Parallel Tasks                 | Branches                                                                                                                              |
| ---- | ---- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | [x]  | `T001`                         | `chore/t001-bootstrap-foundation`                                                                                                     |
| 2    | [x]  | `T002`                         | `feat/t002-backend-auth-api`                                                                                                          |
| 3    | [x]  | `T003`                         | `feat/t003-frontend-auth-delivery`                                                                                                    |
| 4    | [x]  | `T004`                         | `feat/t004-api-build-info-status`                                                                                                     |
| 5    | [x]  | `T005`                         | `feat/t005-public-status-contract`                                                                                                    |
| 6    | [x]  | `T007`                         | `feat/t007-auth-ux-polish`                                                                                                            |
| 7    | [x]  | `T008`, `T009`, `T010`         | `feat/t008-api-response-contracts`, `feat/t009-session-resilience`, `test/t010-user-persistence-contracts`                            |
| 8    | [x]  | `T011`, `T012`, `T013`, `T014` | `chore/t011-deployment-readiness`, `feat/t012-auth-guardrails-audit`, `test/t013-browser-qa-matrix`, `feat/t014-reviewer-demo-polish` |
| 9    | [x]  | `T015`, `T016`, `T017`         | `feat/t015-token-revocation-logout`, `feat/t016-email-verification-flow`, `feat/t017-typed-frontend-api-client`                       |
| 10   | [ ]  | `T018`, `T019`, `T020`         | `feat/t018-account-security-api`, `feat/t019-password-reset-flow`, `feat/t020-account-activity-api`                                   |
| 11   | [ ]  | `T021`, `T022`, `T023`         | `feat/t021-account-settings-frontend`, `feat/t022-account-activity-frontend`, `feat/t023-account-data-lifecycle`                      |
| 12   | [ ]  | `T006`                         | `chore/t006-submission-readiness`                                                                                                     |
