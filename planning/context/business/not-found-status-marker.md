# Not-Found Status Marker

## Goal

Make the not-found state immediately recognizable as an HTTP 404 while providing a bounded frontend canary for the Dark Factory lifecycle.

## Scope

- Add a visible `404` status marker to the existing not-found page.
- Keep the current requested pathname and recovery links unchanged.
- Do not change routing, authentication, API behavior, dependencies, or unrelated page styling.
- Add focused automated coverage for the marker and existing recovery content.
- Perform browser QA on an unknown route at desktop and mobile widths.

## Acceptance Criteria

- Unknown routes display a clear visible `404` marker.
- The requested pathname and both existing recovery links remain present and accessible.
- The marker fits coherently without overlap or horizontal overflow at desktop and mobile widths.
- Focused tests and the repository validation command pass.
- Browser QA confirms the not-found page is coherent at desktop and mobile widths.
