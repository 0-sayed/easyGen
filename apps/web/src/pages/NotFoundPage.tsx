import { Link } from "react-router-dom";

import { authStyles } from "./authStyles";

export function NotFoundPage() {
  return (
    <section className={`${authStyles.card} grid gap-6`} aria-labelledby="not-found-title">
      <div>
        <p className={authStyles.kicker}>easyGen</p>
        <h1 id="not-found-title" className={authStyles.title}>
          Page not found
        </h1>
        <p className={authStyles.statusText}>This route does not exist.</p>
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
