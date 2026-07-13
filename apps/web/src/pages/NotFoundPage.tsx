import { Link, useLocation } from "react-router-dom";

import { authStyles } from "./authStyles";

export function NotFoundPage() {
  const { pathname } = useLocation();

  return (
    <section className={`${authStyles.card} grid gap-6`} aria-labelledby="not-found-title">
      <div>
        <p className={authStyles.kicker}>easyGen</p>
        <p
          className="mb-3 inline-flex rounded-control border border-brand/20 bg-brand/10 px-3 py-1 text-sm font-extrabold leading-5 text-brand"
          aria-label="HTTP status 404"
        >
          404
        </p>
        <h1 id="not-found-title" className={authStyles.title}>
          Page not found
        </h1>
        <p className={authStyles.statusText}>This route does not exist.</p>
      </div>
      <div
        className="grid gap-1 rounded-control border border-line bg-field p-3"
        role="region"
        aria-label="Requested path"
      >
        <p className={authStyles.label}>Requested path</p>
        <code className="block whitespace-normal break-all text-sm leading-6 text-ink">
          {pathname}
        </code>
      </div>
      <div className={authStyles.actions}>
        <Link className={authStyles.primaryLink} to="/signin">
          Sign in
        </Link>
        <Link className={authStyles.secondaryLink} to="/app">
          Open app
        </Link>
      </div>
    </section>
  );
}
