import { Controller, Get, Inject } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";

import { BuildInfoService } from "./build-info/build-info.service";
import type { BuildInfoResponse } from "./build-info/build-info.types";

interface HealthResponse {
  status: "ok";
}

@ApiTags("health")
@Controller()
export class AppController {
  constructor(@Inject(BuildInfoService) private readonly buildInfoService: BuildInfoService) {}

  @Get("health")
  @ApiOkResponse({ description: "API health check." })
  getHealth(): HealthResponse {
    return { status: "ok" };
  }

  @Get("status")
  @ApiOkResponse({ description: "Public API build information." })
  getStatus(): BuildInfoResponse {
    return this.buildInfoService.getBuildInfo();
  }
}
