import { Controller, Get, Inject } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiProperty, ApiTags } from "@nestjs/swagger";

import { BuildInfoService } from "./build-info/build-info.service";
import { BuildInfoResponse } from "./build-info/build-info.types";

class HealthResponse {
  @ApiProperty({
    description: "Liveness status for the API process.",
    example: "ok",
  })
  status!: "ok";
}

@Controller()
export class AppController {
  constructor(@Inject(BuildInfoService) private readonly buildInfoService: BuildInfoService) {}

  @Get("health")
  @ApiTags("health")
  @ApiOperation({
    summary: "Health check",
    description: "Returns a minimal liveness response for uptime checks.",
  })
  @ApiOkResponse({
    description: "API process is accepting requests.",
    type: HealthResponse,
  })
  getHealth(): HealthResponse {
    return { status: "ok" };
  }

  @Get("status")
  @ApiTags("status")
  @ApiOperation({
    summary: "Public build status",
    description:
      "Returns public service, version, and environment metadata for unauthenticated diagnostics.",
  })
  @ApiOkResponse({
    description: "Current public service build metadata.",
    type: BuildInfoResponse,
  })
  getStatus(): BuildInfoResponse {
    return this.buildInfoService.getBuildInfo();
  }
}
