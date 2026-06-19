import { useEffect, useState } from "react";

import { getBuildInfo, type BuildInfo } from "./api";

export function BuildInfoBadge() {
  const [buildInfo, setBuildInfo] = useState<BuildInfo | null>(null);

  useEffect(() => {
    let active = true;

    void getBuildInfo()
      .then((info) => {
        if (active) {
          setBuildInfo(info);
        }
      })
      .catch(() => {
        if (active) {
          setBuildInfo(null);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  if (buildInfo === null) {
    return null;
  }

  return (
    <aside
      className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-xs font-semibold text-muted"
      aria-label="API build information"
    >
      <span>{buildInfo.service}</span>
      <span aria-hidden="true">/</span>
      <span>v{buildInfo.version}</span>
      <span aria-hidden="true">/</span>
      <span>{buildInfo.environment}</span>
    </aside>
  );
}
