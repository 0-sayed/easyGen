import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { getAppInfo, type AppInfo } from "../app-info/api";
import { authStyles } from "./authStyles";

type HomeState =
  | { status: "loading" }
  | { status: "success"; appInfo: AppInfo }
  | { status: "error" };

export function HomePage() {
  const [state, setState] = useState<HomeState>({ status: "loading" });

  useEffect(() => {
    let active = true;

    void getAppInfo()
      .then((appInfo) => {
        if (active) {
          setState({ status: "success", appInfo });
        }
      })
      .catch(() => {
        if (active) {
          setState({ status: "error" });
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const appName = state.status === "success" ? state.appInfo.name : "easyGen";
  const statusText = state.status === "success" ? "API reachable" : "API unavailable";
  const statusClass = state.status === "success" ? "text-brand" : "text-danger";
  const helperText =
    state.status === "loading"
      ? "Checking API..."
      : "Create an account or sign in to continue to the protected app.";

  return (
    <section className={`${authStyles.card} grid gap-6`} aria-labelledby="home-title">
      <div>
        <p className={authStyles.kicker}>Authentication assessment</p>
        <h1 id="home-title" className={authStyles.title}>
          {appName}
        </h1>
        <p className="mt-3 text-base leading-relaxed text-muted">
          Sign up, sign in, and verify protected access from one small full-stack flow.
        </p>
      </div>

      <div className="grid gap-1 rounded-control border border-line bg-field px-4 py-3">
        <p className="text-sm font-bold leading-5 text-label">API status</p>
        <p className={`text-base font-bold leading-6 ${statusClass}`} aria-live="polite">
          {state.status === "loading" ? "Checking API..." : statusText}
        </p>
      </div>

      <p className={authStyles.helper}>{helperText}</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link className={`${authStyles.button} text-center no-underline`} to="/signup">
          Create account
        </Link>
        <Link
          className="min-h-11 rounded-control border border-line bg-white px-4 py-2.5 text-center text-base font-bold text-brand no-underline shadow-sm transition hover:bg-field focus-visible:outline-hidden focus-visible:ring-[3px] focus-visible:ring-brand/25"
          to="/signin"
        >
          Sign in
        </Link>
      </div>
    </section>
  );
}
