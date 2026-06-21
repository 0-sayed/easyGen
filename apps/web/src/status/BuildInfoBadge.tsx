import { useBuildInfo } from "./BuildInfoProvider";

export function BuildInfoBadge() {
  const state = useBuildInfo();

  if (state.status === "loading") {
    return null;
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
