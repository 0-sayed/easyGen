import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { getBuildInfo, getHealthInfo, type BuildInfo, type HealthInfo } from "./api";

export type LivenessState =
  | { status: "loading" }
  | { status: "ready"; healthInfo: HealthInfo }
  | { status: "failed" };

export type BuildInfoState =
  | { status: "loading"; liveness: LivenessState }
  | { status: "ready"; buildInfo: BuildInfo; liveness: LivenessState }
  | { status: "failed"; liveness: LivenessState };

const loadingLiveness: LivenessState = { status: "loading" };
const BuildInfoContext = createContext<BuildInfoState | null>(null);
let sharedBuildInfoRequest: Promise<BuildInfo> | null = null;
let sharedHealthInfoRequest: Promise<HealthInfo> | null = null;

interface BuildInfoProviderProps {
  children: ReactNode;
}

export function BuildInfoProvider({ children }: BuildInfoProviderProps) {
  const [state, setState] = useState<BuildInfoState>({
    status: "loading",
    liveness: loadingLiveness,
  });

  useEffect(() => {
    let active = true;

    sharedBuildInfoRequest ??= getBuildInfo();
    sharedHealthInfoRequest ??= getHealthInfo();

    void sharedBuildInfoRequest
      .then((buildInfo) => {
        if (active) {
          setState((current) => ({ status: "ready", buildInfo, liveness: current.liveness }));
        }
      })
      .catch(() => {
        if (active) {
          setState((current) => ({ status: "failed", liveness: current.liveness }));
        }
        sharedBuildInfoRequest = null;
      });

    void sharedHealthInfoRequest
      .then((healthInfo) => {
        if (active) {
          setState((current) => ({ ...current, liveness: { status: "ready", healthInfo } }));
        }
      })
      .catch(() => {
        if (active) {
          setState((current) => ({ ...current, liveness: { status: "failed" } }));
        }
        sharedHealthInfoRequest = null;
      });

    return () => {
      active = false;
    };
  }, []);

  return <BuildInfoContext.Provider value={state}>{children}</BuildInfoContext.Provider>;
}

export function resetBuildInfoForTests() {
  sharedBuildInfoRequest = null;
  sharedHealthInfoRequest = null;
}

export function useBuildInfo(): BuildInfoState {
  const state = useContext(BuildInfoContext);

  if (state === null) {
    throw new Error("useBuildInfo must be used inside BuildInfoProvider.");
  }

  return state;
}
