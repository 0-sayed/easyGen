import { useBuildInfo, type BuildInfoState, type LivenessState } from "./BuildInfoProvider";
import { formatUptime } from "./uptime";

export function BuildInfoBadge() {
  const state = useBuildInfo();

  return (
    <aside aria-label="API build and liveness information">
      <div
        className={getBuildInfoBadgeClassName(state)}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        aria-label="API build and liveness information"
      >
        <BuildInfoBadgeContent state={state} />
      </div>
    </aside>
  );
}

function BuildInfoBadgeContent({ state }: { state: BuildInfoState }) {
  if (state.status === "loading") {
    return <>Checking API status...</>;
  }

  if (state.status === "failed") {
    return <>API status unavailable</>;
  }

  return (
    <>
      <span>{state.buildInfo.service}</span>
      <span aria-hidden="true">/</span>
      <span>v{state.buildInfo.version}</span>
      <span aria-hidden="true">/</span>
      <span>{state.buildInfo.environment}</span>
      <span aria-hidden="true">/</span>
      <LivenessBadgeText liveness={state.liveness} />
    </>
  );
}

function getBuildInfoBadgeClassName(state: BuildInfoState): string {
  const baseClassName = "text-center text-xs font-semibold";

  if (state.status === "ready") {
    return `${baseClassName} flex max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-1 text-muted`;
  }

  if (state.status === "failed") {
    return `${baseClassName} text-danger`;
  }

  return `${baseClassName} text-muted`;
}

function LivenessBadgeText({ liveness }: { liveness: LivenessState }) {
  if (liveness.status === "loading") {
    return <span>checking liveness</span>;
  }

  if (liveness.status === "failed") {
    return <span>liveness unavailable</span>;
  }

  return (
    <>
      <span>{liveness.healthInfo.scope}</span>
      <span aria-hidden="true">/</span>
      <span>up {formatUptime(liveness.healthInfo.uptimeSeconds)}</span>
    </>
  );
}
