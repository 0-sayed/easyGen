# AGENTS.md

## Working Rules

- Never commit or push unless the user explicitly asks.
- Keep changes scoped to the requested bootstrap step or feature.
- Preserve unrelated user changes in the working tree.
- Prefer the repo's existing scripts, layout, and tooling over new abstractions.

## Repo Map

- `apps/api`: NestJS API, MongoDB via Mongoose, Swagger docs, Pino logging, Vitest tests.
- `apps/web`: React/Vite frontend.
- `packages`: shared workspace packages placeholder.
- `migrations`: migrate-mongo migration files.
- `planning/context/business/task.md`: product task source.
- `planning/context/technical/bootstrap.md`: bootstrap checklist source.
- `README.md`: setup, environment, endpoints, validation, and browser smoke notes.

## Tooling

- Node: `22.14.0` from `.nvmrc`.
- Package manager: `pnpm@10.26.2`.
- Local database: MongoDB from Docker Compose on `127.0.0.1:${MONGODB_PORT:-27018}`.
- Worktree infra isolation: `worktree-compose` reads `.wtcrc.json` and rewrites port-derived URLs.

## Commands

- `make setup`: install dependencies.
- `make infra`: start local Docker services.
- `make infra-down`: stop local Docker services.
- `make api`: run the Nest API dev server.
- `make web`: run the Vite dev server.
- `make dev`: run API and web dev servers together.
- `make check`: run format check, lint, and type-check.
- `make test`: run all existing tests.
- `make validate`: run the full local validation gate.
- `make build`: build all apps/packages.
- `make migrate-up`: run pending Mongo migrations.
- `make migrate-status`: show migration status.

## Validation

- For small config/doc changes, run the smallest relevant check plus `git diff --check`.
- For backend changes, run `make test` or the narrower package test command first, then `make validate` when shared behavior or config changed.
- For frontend changes, run `make web` for manual QA when needed and `make validate` before handoff.
- Docker-backed integration/e2e tests require Docker to be running.

## Test Conventions

- Unit tests use `*.unit.test.ts`.
- Integration tests use `*.integration.test.ts` and real backing services via Testcontainers.
- E2E tests use `*.e2e.test.ts` and boot the Nest app with Supertest.
- Keep tests behavioral: assert public results, not internal wiring.

## Environment Rules

- `.env` is local-only; `.env.example` documents non-secret defaults.
- Do not hardcode usernames, passwords, tokens, or credential-bearing URLs in tracked config, tests, Docker Compose, migration config, or fallbacks.
- `wtc` URL overrides must be port-derived only. For simple local Mongo, use no-auth URIs such as `mongodb://127.0.0.1:${MONGODB_PORT}/easygen?directConnection=true`.
- If an existing Mongo volume was created with auth, do not remove it without user approval.

## Architecture Notes

- API owns HTTP endpoints, app config, database connection setup, observability, and backend tests.
- Web owns browser UI and frontend dev/build config.
- Root owns workspace scripts, CI, formatting, linting, dependency checks, and infra orchestration.
- Keep service ports configurable through `.env.example`, Docker Compose defaults, app config, and `.wtcrc.json`.
