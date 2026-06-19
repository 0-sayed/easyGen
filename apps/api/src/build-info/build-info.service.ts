import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createRequire } from "node:module";

import type { BuildInfoResponse } from "./build-info.types";

const requirePackage = createRequire(__filename);
const VERSION_FALLBACK = "0.0.0";

interface PackageMetadata {
  version?: unknown;
}

@Injectable()
export class BuildInfoService {
  private readonly version = readPackageVersion();

  constructor(@Inject(ConfigService) private readonly configService: ConfigService) {}

  getBuildInfo(): BuildInfoResponse {
    return {
      service: "easygen-api",
      version: this.version,
      environment: this.configService.get<string>("NODE_ENV", "development"),
    };
  }
}

function readPackageVersion(): string {
  try {
    const metadata = requirePackage("../../package.json") as PackageMetadata;
    return typeof metadata.version === "string" && metadata.version.trim().length > 0
      ? metadata.version
      : VERSION_FALLBACK;
  } catch {
    return VERSION_FALLBACK;
  }
}
