# Config and Deployment Readiness

## Goal

Harden the app for predictable startup and deployment-like operation while keeping local development simple.

## Scope

- Add startup validation for required and optional environment variables, especially `JWT_SECRET`, `JWT_EXPIRES_IN`, `PORT`, `LOG_LEVEL`, and MongoDB configuration.
- Add or refine readiness behavior so operators can distinguish process liveness from database readiness.
- Keep `.env.example`, README, Docker Compose defaults, tests, and app config aligned.
- Ensure production-like startup fails fast for invalid critical config.
- Do not introduce secret defaults that could be mistaken for production-safe values.

## Acceptance Criteria

- Invalid critical config fails at startup with a clear error.
- Local documented defaults still work after copying `.env.example` to `.env` and setting a local JWT secret.
- Health/readiness docs describe which endpoint checks process state and which checks backing services.
- Focused backend config tests cover valid and invalid environment examples.
