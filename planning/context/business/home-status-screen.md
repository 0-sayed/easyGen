# Home Status Screen

## Product Goal

Add a small public home screen before authentication so the app no longer redirects `/` straight to sign in.

The screen should make the assessment feel more complete without changing the core auth scope:

- show the product name and a short authentication-focused message,
- show whether the API is reachable,
- provide clear links to sign up and sign in,
- keep the protected `/app` page behind the existing auth guard.

## Backend Scope

Add one unauthenticated read-only endpoint for the home screen:

- `GET /app-info`

Response shape:

```json
{
  "name": "easyGen",
  "status": "ok",
  "auth": {
    "signup": true,
    "signin": true
  }
}
```

The endpoint must not expose secrets, environment values, database internals, user counts, or token configuration.

## Frontend Scope

Replace the `/` redirect with a public home page that:

- loads `GET /app-info`,
- displays the app name and API status,
- links to `/signup` and `/signin`,
- shows a compact failure state if the endpoint is unavailable,
- keeps `/signup`, `/signin`, and protected `/app` behavior unchanged.

## Acceptance Criteria

- Visiting `/` renders the home screen instead of redirecting.
- The home screen displays a reachable API status when `GET /app-info` succeeds.
- The home screen still offers sign up and sign in actions if `GET /app-info` fails.
- `GET /app-info` is covered by an API test.
- The home route is covered by a frontend unit test.
- Existing auth tests continue to pass.
