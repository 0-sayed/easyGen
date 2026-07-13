import { useBuildInfo, type LivenessState } from "./BuildInfoProvider";
import { formatUptime } from "./uptime";

export function BuildInfoBadge() {
  const state = useBuildInfo();

  if (state.status === "loading") {
    return (
      <div
        className="text-center text-xs font-semibold text-muted"
        role="status"
        aria-label="Checking API status"
      >
        Checking API status...
      </div>
    );
  }

  if (state.status === "failed") {
    return (
      <div
        className="text-center text-xs font-semibold text-danger"
        role="status"
        aria-label="API status unavailable"
      >
        API status unavailable
      </div>
    );
  }

  return (
    <aside
      className="flex max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-xs font-semibold text-muted"
      aria-label="API build and liveness information"
    >
      <span>{state.buildInfo.service}</span>
      <span aria-hidden="true">/</span>
      <span>v{state.buildInfo.version}</span>
      <span aria-hidden="true">/</span>
      <span>{state.buildInfo.environment}</span>
      <span aria-hidden="true">/</span>
      <LivenessBadgeText liveness={state.liveness} />
    </aside>
  );
}

function LivenessBadgeText({ liveness }: { liveness: LivenessState }) {
  if (liveness.status === "loading") {
    return <span role="status">checking liveness</span>;
  }

  if (liveness.status === "failed") {
    return <span role="status">liveness unavailable</span>;
  }

  return (
    <>
      <span>{liveness.healthInfo.scope}</span>
      <span aria-hidden="true">/</span>
      <span>up {formatUptime(liveness.healthInfo.uptimeSeconds)}</span>
    </>
  );
}
