import { useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthProvider";
import { authStyles } from "./authStyles";

export function ApplicationPage() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  function handleLogout() {
    logout();
    void navigate("/signin", { replace: true });
  }

  return (
    <section className={`${authStyles.card} grid gap-6`} aria-labelledby="application-title">
      <div>
        <p className={authStyles.kicker}>easyGen</p>
        <h1 id="application-title" className={authStyles.title}>
          Welcome to easyGen.
        </h1>
        <p className={authStyles.userName}>{user?.name}</p>
      </div>
      <button className={authStyles.button} type="button" onClick={handleLogout}>
        Log out
      </button>
    </section>
  );
}
