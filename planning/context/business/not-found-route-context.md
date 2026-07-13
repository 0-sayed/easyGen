# Not-Found Route Context

## Goal

Help users understand which unknown route they reached and recover through the existing navigation actions.

## Scope

- Show the requested pathname on the not-found page without displaying query parameters or fragments.
- Preserve the existing sign-in and application recovery links.
- Ensure long pathnames wrap without causing horizontal overflow.
- Do not change routing, authentication, or backend behavior.
- Add focused automated coverage for the rendered pathname and recovery links.
- Perform browser QA with a long unknown route at desktop and mobile widths.

## Acceptance Criteria

- An unknown route displays its pathname and excludes query parameters and fragments.
- Existing recovery links remain correct and keyboard accessible.
- Long pathnames remain readable without horizontal overflow.
- Focused tests and repository validation pass.
- Browser QA confirms the page is coherent at desktop and mobile widths.
