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

Priority controls orchestration order; task IDs are stable labels and do not need to be numeric execution order.

| Done | Priority | Size | Task                                             | Depends On             | Branch                                           | Context                                                                                                                    |
| ---- | -------- | ---- | ------------------------------------------------ | ---------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| [x]  | 10       | L    | `T001` — Bootstrap project foundation            | —                      | `chore/t001-bootstrap-foundation`                | `planning/context/technical/bootstrap.md`, `planning/context/technical/tech-stack.md`                                      |
| [x]  | 20       | M    | `T002` — Backend auth API                        | `T001`                 | `feat/t002-backend-auth-api`                     | `planning/context/business/task.md`, `planning/context/technical/tech-stack.md`                                            |
| [x]  | 30       | M    | `T003` — Frontend auth flow and delivery         | `T001`, `T002`         | `feat/t003-frontend-auth-delivery`               | `planning/context/business/task.md`, `planning/context/technical/bootstrap.md`, `planning/context/technical/tech-stack.md` |
| [x]  | 40       | S    | `T004` — API build info status                   | `T001`                 | `feat/t004-api-build-info-status`                | `planning/context/business/api-build-info-status.md`, `planning/context/technical/tech-stack.md`                           |
| [x]  | 50       | S    | `T005` — Public status documentation surface     | `T004`                 | `feat/t005-public-status-contract`               | `planning/context/technical/public-status-contract.md`                                                                     |
| [x]  | 60       | S    | `T007` — Application copy and route polish       | `T003`                 | `feat/t007-auth-ux-polish`                       | `planning/context/business/auth-ux-polish.md`                                                                              |
| [x]  | 70       | M    | `T008` — Explicit API response contracts         | `T002`, `T004`         | `feat/t008-api-response-contracts`               | `planning/context/technical/api-response-contracts.md`                                                                     |
| [x]  | 71       | M    | `T009` — Frontend session resilience             | `T003`, `T004`         | `feat/t009-session-resilience`                   | `planning/context/business/session-resilience.md`                                                                          |
| [x]  | 72       | M    | `T010` — User persistence contract coverage      | `T002`                 | `test/t010-user-persistence-contracts`           | `planning/context/technical/user-persistence-contracts.md`                                                                 |
| [x]  | 80       | L    | `T011` — Config and deployment readiness         | `T008`                 | `chore/t011-deployment-readiness`                | `planning/context/technical/deployment-readiness.md`                                                                       |
| [x]  | 81       | L    | `T012` — Auth abuse guardrails and audit trail   | `T008`, `T010`         | `feat/t012-auth-guardrails-audit`                | `planning/context/technical/auth-guardrails-audit.md`                                                                      |
| [x]  | 82       | L    | `T013` — Full-stack browser QA matrix            | `T007`, `T009`         | `test/t013-browser-qa-matrix`                    | `planning/context/technical/browser-qa-matrix.md`                                                                          |
| [x]  | 83       | L    | `T014` — Reviewer-facing application demo polish | `T007`, `T009`         | `feat/t014-reviewer-demo-polish`                 | `planning/context/business/reviewer-demo-polish.md`                                                                        |
| [x]  | 90       | L    | `T015` — Backend token revocation and logout API | `T008`, `T011`, `T012` | `feat/t015-token-revocation-logout`              | `planning/context/technical/token-revocation.md`                                                                           |
| [x]  | 91       | L    | `T016` — Email verification token flow           | `T010`, `T011`, `T012` | `feat/t016-email-verification-flow`              | `planning/context/technical/email-verification.md`                                                                         |
| [x]  | 92       | M    | `T017` — Typed frontend API client contracts     | `T008`, `T009`         | `feat/t017-typed-frontend-api-client`            | `planning/context/technical/frontend-api-client-contract.md`                                                               |
| [x]  | 100      | M    | `T018` — Account profile and password change API | `T010`, `T015`         | `feat/t018-account-security-api`                 | `planning/context/technical/account-security-api.md`                                                                       |
| [x]  | 101      | L    | `T019` — Password reset token flow               | `T015`, `T016`         | `feat/t019-password-reset-flow`                  | `planning/context/technical/password-reset.md`                                                                             |
| [x]  | 102      | M    | `T020` — User-facing account activity API        | `T012`, `T015`         | `feat/t020-account-activity-api`                 | `planning/context/technical/account-activity-api.md`                                                                       |
| [x]  | 110      | M    | `T021` — Account settings frontend               | `T017`, `T018`         | `feat/t021-account-settings-frontend`            | `planning/context/business/account-settings-frontend.md`                                                                   |
| [x]  | 111      | M    | `T022` — Account activity frontend               | `T017`, `T020`         | `feat/t022-account-activity-frontend`            | `planning/context/business/account-activity-frontend.md`                                                                   |
| [x]  | 112      | L    | `T023` — Account deletion and data lifecycle     | `T015`, `T018`         | `feat/t023-account-data-lifecycle`               | `planning/context/technical/account-data-lifecycle.md`                                                                     |
| [x]  | 113      | S    | `T024` — Email verification frontend flow        | `T016`, `T017`         | `feat/t024-email-verification-frontend`          | `planning/context/business/email-verification-frontend.md`                                                                 |
| [x]  | 114      | S    | `T025` — Password reset frontend flow            | `T017`, `T019`         | `feat/t025-password-reset-frontend`              | `planning/context/business/password-reset-frontend.md`                                                                     |
| [x]  | 115      | S    | `T026` — Revoked-session reauth UX               | `T009`, `T015`, `T017` | `feat/t026-revoked-session-reauth-ux`            | `planning/context/business/revoked-session-reauth-ux.md`                                                                   |
| [x]  | 116      | S    | `T029` — Account deletion frontend confirmation  | `T017`, `T021`, `T023` | `feat/t029-account-deletion-frontend`            | `planning/context/business/account-deletion-frontend.md`                                                                   |
| [x]  | 117      | S    | `T027` — Auth recovery browser QA slice          | `T024`, `T025`         | `test/t027-auth-recovery-browser-qa`             | `planning/context/technical/auth-recovery-browser-qa.md`                                                                   |
| [x]  | 118      | S    | `T028` — Settings session invalidation polish    | `T021`, `T026`         | `feat/t028-settings-session-invalidation-polish` | `planning/context/business/settings-session-invalidation-polish.md`                                                        |
| [x]  | 119      | S    | `T030` — Account lifecycle browser QA slice      | `T022`, `T028`, `T029` | `test/t030-account-lifecycle-browser-qa`         | `planning/context/technical/account-lifecycle-browser-qa.md`                                                               |
| [x]  | 120      | S    | `T006` — Submission readiness pass               | `T027`, `T030`         | `chore/t006-submission-readiness`                | `planning/context/business/submission-readiness.md`                                                                        |
| [x]  | 121      | S    | `T031` — Dark Factory live smoke documentation   | `T006`                 | `chore/t031-dark-factory-live-smoke`             | `planning/context/technical/dark-factory-live-smoke.md`                                                                    |
| [ ]  | 122      | S    | `T032` — Sign-in password visibility             | `T031`                 | `feat/t032-signin-password-visibility`           | `planning/context/business/signin-password-visibility.md`                                                                  |
| [x]  | 123      | S    | `T033` — Not-found route context                 | `T031`                 | `feat/t033-not-found-route-context`              | `planning/context/business/not-found-route-context.md`                                                                     |
| [x]  | 124      | S    | `T034` — Health service identity                 | `T031`                 | `feat/t034-health-service-identity`              | `planning/context/technical/health-service-identity.md`                                                                    |
