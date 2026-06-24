# easyGen

Full-stack authentication test task for a React/Vite frontend and NestJS/MongoDB backend.

## Setup

Use Node `22.14.0` and pnpm `10.26.2`.

```bash
pnpm install
cp .env.example .env
# Set JWT_SECRET in .env before starting the API.
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

| Variable                          | Purpose                                                                                 | Default                                                   |
| --------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `PORT`                            | API HTTP port; integer from 1 through 65535                                             | `3000`                                                    |
| `LOG_LEVEL`                       | Pino/Nest logger level: `trace`, `debug`, `info`, `warn`, `error`, `fatal`, or `silent` | `info`                                                    |
| `WEB_PORT`                        | Vite dev server port; integer from 1 through 65535                                      | `5173`                                                    |
| `VITE_API_URL`                    | API URL used by the frontend                                                            | `http://127.0.0.1:3000`                                   |
| `MONGODB_PORT`                    | MongoDB host port; integer from 1 through 65535                                         | `27018`                                                   |
| `MONGODB_URI`                     | API and migration MongoDB connection string                                             | `mongodb://127.0.0.1:27018/easygen?directConnection=true` |
| `JWT_SECRET`                      | JWT signing secret required by the API                                                  | empty; set in local `.env`                                |
| `JWT_EXPIRES_IN`                  | JWT access token lifetime; duration such as `15m`, `1h`, or `7d`                        | `15m`                                                     |
| `EMAIL_VERIFICATION_TOKEN_TTL_MS` | Email verification token lifetime in milliseconds                                       | `900000`                                                  |
| `PASSWORD_RESET_TOKEN_TTL_MS`     | Password reset token lifetime in milliseconds                                           | `900000`                                                  |
| `AUTH_THROTTLE_LIMIT`             | Auth attempts allowed per throttle window                                               | `5`                                                       |
| `AUTH_THROTTLE_MAX_ENTRIES`       | Maximum in-memory auth throttle windows per API process                                 | `10000`                                                   |
| `AUTH_THROTTLE_WINDOW_MS`         | Auth throttle window duration in milliseconds                                           | `60000`                                                   |

## Local Services

`docker-compose.yml` starts MongoDB 8.0 on `127.0.0.1:${MONGODB_PORT:-27018}`. The Compose file avoids fixed container names so worktree-specific stacks can be isolated.

`pnpm migrate:up` applies database constraints, including the unique `users.email` index used by signup and signin.

For parallel git worktrees, use `worktree-compose` with the committed `.wtcrc.json`; keep migrations, app URLs, and browser QA pointed at the current worktree's `.env`.

## API Endpoints

- `GET /health` - liveness check returning `{ "status": "ok" }`; does not check MongoDB.
- `GET /ready` - readiness check returning MongoDB status; returns `503` when the database is unavailable.
- `GET /status` - public build/status metadata returning `service`, `version`, and `environment`.
- `POST /auth/signup`
- `POST /auth/signin`
- `POST /auth/email-verification/request`
- `POST /auth/email-verification/confirm`
- `POST /auth/password-reset/request`
- `POST /auth/password-reset/confirm`
- `POST /auth/logout` - revokes the current bearer token; requires a bearer token.
- `GET /auth/me` - requires a bearer token.
- `GET /docs`
- `GET /docs-json`

Use `/health` for process liveness probes and `/ready` for traffic readiness probes that must confirm MongoDB is connected.

## Authentication Flow

- `POST /auth/signup` creates a user and returns an access token.
- `POST /auth/signin` returns an access token for valid credentials.
- `POST /auth/email-verification/request` prepares a verification token and logs delivery metadata as `auth.email_verification.token`; the raw token is not logged.
- `POST /auth/email-verification/confirm` consumes that token once for the matching email address.
- `POST /auth/password-reset/request` prepares a password reset token and logs delivery metadata as `auth.password_reset.token`; the raw token is not logged.
- `POST /auth/password-reset/confirm` consumes that token once for the matching email address, updates the password, and revokes active sessions for the user.
- `POST /auth/logout` revokes the stored token on the backend; a revoked token is rejected by protected endpoints.
- `GET /auth/me` verifies the stored token and powers the protected application page.
- The React app provides `/signup`, `/signin`, and `/app`.

## Validation

`pnpm validate` runs format check, lint, type-check, tests, Knip, dependency audit, and build.

Run the browser QA matrix when you want full-stack auth confidence:

```bash
pnpm --filter @easygen/web exec playwright install chromium
pnpm test:browser
pnpm infra:down
```

The matrix is defined in `apps/web/e2e/auth-flow.pw.ts`. Playwright starts MongoDB, the API, and the web app through `apps/web/playwright.config.ts`; Docker must be available for MongoDB. Override `PORT`, `WEB_PORT`, and `MONGODB_PORT` when running parallel worktrees.

License: MIT
