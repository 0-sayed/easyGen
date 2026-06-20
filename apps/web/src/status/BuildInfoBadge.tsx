import { useEffect, useState } from "react";

import { getBuildInfo, type BuildInfo } from "./api";

type BuildInfoState =
  | { status: "loading" }
  | { status: "ready"; buildInfo: BuildInfo }
  | { status: "failed" };

export function BuildInfoBadge() {
  const [state, setState] = useState<BuildInfoState>({ status: "loading" });

  useEffect(() => {
    let active = true;

    void getBuildInfo()
      .then((info) => {
        if (active) {
          setState({ status: "ready", buildInfo: info });
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
  }, []);

  if (state.status === "loading") {
    return null;
  }

  if (state.status === "failed") {
    return (
      <aside
        className="text-center text-xs font-semibold text-danger"
        role="status"
        aria-label="API status unavailable"
      >
        API status unavailable
      </aside>
    );
  }

  return (
    <aside
      className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-xs font-semibold text-muted"
      aria-label="API build information"
    >
      <span>{state.buildInfo.service}</span>
      <span aria-hidden="true">/</span>
      <span>v{state.buildInfo.version}</span>
      <span aria-hidden="true">/</span>
      <span>{state.buildInfo.environment}</span>
    </aside>
  );
}
