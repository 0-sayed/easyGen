import { useNavigate } from "react-router-dom";

import { AccountActivityPanel } from "../account-activity/AccountActivityPanel";
import { AccountSettingsPanel } from "../account-settings/AccountSettingsPanel";
import { useAuth } from "../auth/AuthProvider";
import { ApplicationStatusPanel } from "../status/ApplicationStatusPanel";
import { authStyles } from "./authStyles";

export function ApplicationPage() {
  const navigate = useNavigate();
  const { accessToken, logout, replaceUser, user } = useAuth();

  function handleLogout() {
    void logout()
      .catch(() => undefined)
      .then(() => {
        void navigate("/signin", { replace: true });
      });
  }

  return (
    <section className={`${authStyles.appCard} grid gap-6`} aria-labelledby="application-title">
      <div>
        <p className={authStyles.kicker}>easyGen</p>
        <h1 id="application-title" className={authStyles.title}>
          Welcome to the application.
        </h1>
        <p className={authStyles.userName}>Signed in as {user?.name}.</p>
      </div>

      <section className="grid gap-4" aria-labelledby="account-summary-title">
        <h2 id="account-summary-title" className="m-0 text-xl font-semibold leading-tight text-ink">
          Account summary
        </h2>
        <dl className="grid gap-3 text-sm leading-5 text-muted sm:grid-cols-3">
          <div className="grid gap-1">
            <dt className="font-bold text-label">Name</dt>
            <dd className="m-0">{user?.name}</dd>
          </div>
          <div className="grid gap-1">
            <dt className="font-bold text-label">Email</dt>
            <dd className="m-0">{user?.email}</dd>
          </div>
          <div className="grid gap-1">
            <dt className="font-bold text-label">User ID</dt>
            <dd className="m-0">{user?.id}</dd>
          </div>
        </dl>
      </section>

      <AccountSettingsPanel accessToken={accessToken} user={user} onUserUpdated={replaceUser} />

      <ApplicationStatusPanel />

      <AccountActivityPanel accessToken={accessToken} />

      <button className={authStyles.button} type="button" onClick={handleLogout}>
        Log out
      </button>
    </section>
  );
}
