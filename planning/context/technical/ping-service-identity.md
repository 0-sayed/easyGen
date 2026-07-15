# Ping Service Identity

## Goal

Identify the API service in the existing public ping response while preserving its lightweight reachability purpose.

## Scope

- Extend `GET /ping` to return the stable service identifier `easygen-api` alongside `status`.
- Update the response DTO, OpenAPI contract, and focused unauthenticated end-to-end coverage.
- Preserve all health, readiness, status, authentication, and frontend behavior.
- Do not add dependencies or create another endpoint.
- Update only the `T049` task row and its dedicated Mermaid class entry when marking the task complete.

## Acceptance Criteria

- An unauthenticated `GET /ping` request returns HTTP 200 with only `status: "ok"` and `service: "easygen-api"`; JSON key order is not significant.
- OpenAPI constrains `status` to `"ok"` and `service` to `"easygen-api"` using enum or equivalent literal metadata.
- Focused backend tests and the repository validation command pass.
- Browser QA is not required because the task changes no browser-facing behavior.
