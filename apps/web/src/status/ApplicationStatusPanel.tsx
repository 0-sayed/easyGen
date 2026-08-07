import { useBuildInfo, type LivenessState } from "./BuildInfoProvider";
import { formatUptime } from "./uptime";
import type { BuildInfo, HealthInfo } from "./api";

const livenessScopeLabels = {
  process: "Process",
} satisfies Record<HealthInfo["scope"], string>;

const buildSourceLabels = {
  runtime: "Runtime",
} satisfies Record<BuildInfo["source"], string>;

function formatLivenessScope(scope: HealthInfo["scope"]): string {
  return livenessScopeLabels[scope];
}

function formatBuildSource(source: BuildInfo["source"]): string {
  return buildSourceLabels[source];
}

export function ApplicationStatusPanel() {
  const state = useBuildInfo();

  return (
    <section
      className="grid gap-4 rounded-card border border-line bg-field p-4"
      aria-labelledby="api-status-title"
    >
      <div>
        <p className="mb-2 mt-0 text-xs font-extrabold uppercase tracking-wide text-brand">
          System status
        </p>
        <h2 id="api-status-title" className="m-0 text-xl font-semibold leading-tight text-ink">
          API connection
        </h2>
      </div>

      {state.status === "loading" ? (
        <p
          className="m-0 text-sm font-semibold leading-5 text-muted"
          role="status"
          aria-label="Checking API connection"
        >
          Checking API connection...
        </p>
      ) : null}

      {state.status === "failed" ? (
        <div
          className="grid gap-1 text-sm leading-5 text-muted"
          role="status"
          aria-label="API connection unavailable"
        >
          <p className="m-0 font-semibold text-danger">API status unavailable</p>
          <p className="m-0">Account details remain available.</p>
        </div>
      ) : null}

      {state.status === "ready" ? (
        <div
          className="grid gap-3 text-sm leading-5 text-muted"
          role="status"
          aria-label="API connection"
        >
          <p className="m-0 font-semibold text-brand-strong">API connected</p>
          <dl className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <div className="grid gap-0.5">
              <dt className="font-bold text-label">Service</dt>
              <dd className="m-0">{state.buildInfo.service}</dd>
            </div>
            <div className="grid gap-0.5">
              <dt className="font-bold text-label">Version</dt>
              <dd className="m-0">v{state.buildInfo.version}</dd>
            </div>
            <div className="grid gap-0.5">
              <dt className="font-bold text-label">Environment</dt>
              <dd className="m-0">{state.buildInfo.environment}</dd>
            </div>
            <div className="grid gap-0.5">
              <dt className="font-bold text-label">Source</dt>
              <dd className="m-0">{formatBuildSource(state.buildInfo.source)}</dd>
            </div>
            <LivenessDetails liveness={state.liveness} />
          </dl>
        </div>
      ) : null}
    </section>
  );
}

function LivenessDetails({ liveness }: { liveness: LivenessState }) {
  if (liveness.status === "loading") {
    return (
      <div className="grid gap-0.5">
        <dt className="font-bold text-label">Liveness scope</dt>
        <dd className="m-0">checking</dd>
      </div>
    );
  }

  if (liveness.status === "failed") {
    return (
      <div className="grid gap-0.5">
        <dt className="font-bold text-label">Liveness scope</dt>
        <dd className="m-0">unavailable</dd>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-0.5">
        <dt className="font-bold text-label">Liveness scope</dt>
        <dd className="m-0">{formatLivenessScope(liveness.healthInfo.scope)}</dd>
      </div>
      <div className="grid gap-0.5">
        <dt className="font-bold text-label">Uptime</dt>
        <dd className="m-0">{formatUptime(liveness.healthInfo.uptimeSeconds)}</dd>
      </div>
    </>
  );
}
