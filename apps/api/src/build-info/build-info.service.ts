import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import apiPackage from "../../package.json";
import type { BuildInfoResponse } from "./build-info.types";

const VERSION_FALLBACK = "0.0.0";
const apiVersion =
  typeof apiPackage.version === "string" && apiPackage.version.trim().length > 0
    ? apiPackage.version
    : VERSION_FALLBACK;

@Injectable()
export class BuildInfoService {
  private readonly version = apiVersion;

  constructor(@Inject(ConfigService) private readonly configService: ConfigService) {}

  getBuildInfo(): BuildInfoResponse {
    return {
      service: "easygen-api",
      version: this.version,
      environment: this.configService.get<string>("NODE_ENV", "development"),
      source: "runtime",
    };
  }
}
