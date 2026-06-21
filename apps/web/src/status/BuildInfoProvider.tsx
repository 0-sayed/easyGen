import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { getBuildInfo, type BuildInfo } from "./api";

export type BuildInfoState =
  | { status: "loading" }
  | { status: "ready"; buildInfo: BuildInfo }
  | { status: "failed" };

const BuildInfoContext = createContext<BuildInfoState | null>(null);
let sharedBuildInfoRequest: Promise<BuildInfo> | null = null;

interface BuildInfoProviderProps {
  children: ReactNode;
}

export function BuildInfoProvider({ children }: BuildInfoProviderProps) {
  const [state, setState] = useState<BuildInfoState>({ status: "loading" });

  useEffect(() => {
    let active = true;

    sharedBuildInfoRequest ??= getBuildInfo();

    void sharedBuildInfoRequest
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

  return <BuildInfoContext.Provider value={state}>{children}</BuildInfoContext.Provider>;
}

export function resetBuildInfoForTests() {
  sharedBuildInfoRequest = null;
}

export function useBuildInfo(): BuildInfoState {
  const state = useContext(BuildInfoContext);

  if (state === null) {
    throw new Error("useBuildInfo must be used inside BuildInfoProvider.");
  }

  return state;
}
