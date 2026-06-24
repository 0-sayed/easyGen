import { useEffect, useState } from "react";

import { getAccountActivity, type AccountActivityEntry } from "../auth/api";

type ActivityState =
  | { status: "loading" }
  | { status: "ready"; activities: AccountActivityEntry[] }
  | { status: "failed" };

export function AccountActivityPanel({ accessToken }: { accessToken: string | null }) {
  const [state, setState] = useState<ActivityState>(() =>
    accessToken === null ? { status: "failed" } : { status: "loading" }
  );

  useEffect(() => {
    let active = true;

    if (accessToken === null) {
      setState({ status: "failed" });
      return;
    }

    setState({ status: "loading" });

    void getAccountActivity(accessToken)
      .then((response) => {
        if (active) {
          setState({ status: "ready", activities: response.activities });
        }
      })
      .catch(() => {
        if (active) {
          setState({ status: "failed" });
        }
      });

    return () => {
      active = false;
    };
  }, [accessToken]);

  return (
    <section
      className="grid gap-4 rounded-card border border-line bg-field p-4"
      aria-labelledby="account-activity-title"
    >
      <div>
        <p className="mb-2 mt-0 text-xs font-extrabold uppercase tracking-wide text-brand">
          Account activity
        </p>
        <h2 id="account-activity-title" className="m-0 text-xl font-semibold leading-tight text-ink">
          Recent activity
        </h2>
      </div>

      {state.status === "loading" ? (
        <p
          className="m-0 text-sm font-semibold leading-5 text-muted"
          role="status"
          aria-label="Loading account activity"
        >
          Loading recent account activity...
        </p>
      ) : null}

      {state.status === "failed" ? (
        <div
          className="grid gap-1 text-sm leading-5 text-muted"
          role="status"
          aria-label="Account activity unavailable"
        >
          <p className="m-0 font-semibold text-danger">Recent account activity is unavailable.</p>
          <p className="m-0">Your account summary and logout remain available.</p>
        </div>
      ) : null}

      {state.status === "ready" && state.activities.length === 0 ? (
        <p className="m-0 text-sm leading-5 text-muted">No recent account activity yet.</p>
      ) : null}

      {state.status === "ready" && state.activities.length > 0 ? (
        <ol className="m-0 grid list-none gap-3 p-0" aria-label="Recent account activity">
          {state.activities.map((activity) => (
            <li className="grid gap-1 border-t border-line pt-3 first:border-t-0 first:pt-0" key={activity.id}>
              <span className="text-sm font-bold leading-5 text-label">{activity.description}</span>
              <time className="text-sm leading-5 text-muted" dateTime={activity.occurredAt}>
                {formatActivityTimestamp(activity.occurredAt)}
              </time>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}

function formatActivityTimestamp(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
