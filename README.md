# easyGen

Full-stack authentication test task for a React/Vite frontend and NestJS/MongoDB backend.

## Setup

Use Node `22.14.0` and pnpm `10.26.2`.

```bash
pnpm install
cp .env.example .env
pnpm infra:up
pnpm migrate:up
pnpm validate
```

Run the API and web app together:

```bash
pnpm --parallel --stream --filter @easygen/api --filter @easygen/web run dev
```

Or use the Makefile shortcuts:

```bash
make setup
make infra
make dev
make validate
```

## Project Structure

```text
apps/
  api/          NestJS API, Swagger docs, MongoDB module, tests
  web/          React + Vite app shell
migrations/     migrate-mongo migration files
packages/       Shared workspace packages
planning/       Business and technical planning context
```

## Environment

Copy `.env.example` to `.env`.

| Variable                    | Purpose                                                 | Default                                                   |
| --------------------------- | ------------------------------------------------------- | --------------------------------------------------------- |
| `PORT`                      | API HTTP port                                           | `3000`                                                    |
| `LOG_LEVEL`                 | Pino/Nest logger level                                  | `info`                                                    |
| `WEB_PORT`                  | Vite dev server port                                    | `5173`                                                    |
| `VITE_API_URL`              | API URL used by the frontend                            | `http://127.0.0.1:3000`                                   |
| `MONGODB_PORT`              | MongoDB host port                                       | `27018`                                                   |
| `MONGODB_URI`               | API and migration MongoDB connection string             | `mongodb://127.0.0.1:27018/easygen?directConnection=true` |
| `JWT_SECRET`                | JWT signing secret required by the API                  | empty; set in local `.env`                                |
| `JWT_EXPIRES_IN`            | JWT access token lifetime                               | `15m`                                                     |
| `AUTH_THROTTLE_LIMIT`       | Auth attempts allowed per throttle window               | `5`                                                       |
| `AUTH_THROTTLE_MAX_ENTRIES` | Maximum in-memory auth throttle windows per API process | `10000`                                                   |
| `AUTH_THROTTLE_WINDOW_MS`   | Auth throttle window duration in milliseconds           | `60000`                                                   |

## Local Services

`docker-compose.yml` starts MongoDB 8.0 on `127.0.0.1:${MONGODB_PORT:-27018}`. The Compose file avoids fixed container names so worktree-specific stacks can be isolated.

`pnpm migrate:up` applies database constraints, including the unique `users.email` index used by signup and signin.

For parallel git worktrees, use `worktree-compose` with the committed `.wtcrc.json`; keep migrations, app URLs, and browser QA pointed at the current worktree's `.env`.

## API Endpoints

- `GET /health` - liveness check returning `{ "status": "ok" }`.
- `GET /status` - public build/status metadata returning `service`, `version`, and `environment`.
- `POST /auth/signup`
- `POST /auth/signin`
- `GET /auth/me` - requires a bearer token.
- `GET /docs`
- `GET /docs-json`

## Authentication Flow

- `POST /auth/signup` creates a user and returns an access token.
- `POST /auth/signin` returns an access token for valid credentials.
- `GET /auth/me` verifies the stored token and powers the protected application page.
- The React app provides `/signup`, `/signin`, and `/app`.

## Validation

`pnpm validate` runs format check, lint, type-check, tests, Knip, dependency audit, and build.

Run the browser smoke test when you want full-stack UI confidence:

```bash
pnpm --filter @easygen/web exec playwright install chromium
pnpm test:browser
pnpm infra:down
```

License: MIT
