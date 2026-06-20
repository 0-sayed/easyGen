import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "./AuthProvider";
import { authStyles } from "../pages/authStyles";

export function RequireAuth() {
  const { isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <section
        className={`${authStyles.card} grid gap-3`}
        role="status"
        aria-live="polite"
        aria-labelledby="session-loading-title"
      >
        <p className={authStyles.kicker}>easyGen</p>
        <h1 id="session-loading-title" className={authStyles.title}>
          Checking your session
        </h1>
        <p className={authStyles.statusText}>
          We are confirming your saved sign-in before opening the app.
        </p>
      </section>
    );
  }

  if (user === null) {
    return <Navigate to="/signin" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
