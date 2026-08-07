import { Controller, Get, Inject } from "@nestjs/common";
import {
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiServiceUnavailableResponse,
  ApiTags,
} from "@nestjs/swagger";

import { BuildInfoService } from "./build-info/build-info.service";
import { BuildInfoResponse } from "./build-info/build-info.types";
import {
  DatabaseReadinessService,
  type DatabaseReadyResponse,
} from "./database/database-readiness.service";

class HealthResponse {
  @ApiProperty({
    description: "Stable public service identifier for the API.",
    example: "easygen-api",
    enum: ["easygen-api"],
  })
  service!: "easygen-api";

  @ApiProperty({
    description: "Declares that the health response reports API process liveness.",
    example: "process",
    enum: ["process"],
  })
  scope!: "process";

  @ApiProperty({
    description: "Liveness status for the API process.",
    example: "ok",
    enum: ["ok"],
  })
  status!: "ok";

  @ApiProperty({
    description: "Elapsed uptime for the current API process, in whole seconds.",
    example: 0,
    minimum: 0,
    type: "integer",
  })
  uptimeSeconds!: number;
}

class PingResponse {
  @ApiProperty({
    description: "Stable public service identifier for the API.",
    example: "easygen-api",
    enum: ["easygen-api"],
  })
  service!: "easygen-api";

  @ApiProperty({
    description: "Declares that the ping response represents API reachability.",
    example: "reachability",
    enum: ["reachability"],
  })
  purpose!: "reachability";

  @ApiProperty({
    description: "Declares that the ping response is served over HTTP.",
    example: "http",
    enum: ["http"],
  })
  transport!: "http";

  @ApiProperty({
    description: "Minimal API reachability status.",
    example: "ok",
    enum: ["ok"],
  })
  status!: "ok";
}

class ReadinessChecksResponse {
  @ApiProperty({
    description: "MongoDB connection readiness.",
    example: "ready",
    enum: ["ready"],
  })
  database!: "ready";
}

class ReadinessResponse {
  @ApiProperty({
    description: "Readiness status for backing services.",
    example: "ready",
    enum: ["ready"],
  })
  status!: "ready";

  @ApiProperty({ type: ReadinessChecksResponse })
  checks!: ReadinessChecksResponse;
}

class ReadinessUnavailableChecksResponse {
  @ApiProperty({
    description: "MongoDB connection readiness.",
    example: "unavailable",
    enum: ["unavailable"],
  })
  database!: "unavailable";
}

class ReadinessUnavailableResponse {
  @ApiProperty({
    description: "Readiness status for backing services.",
    example: "error",
    enum: ["error"],
  })
  status!: "error";

  @ApiProperty({ type: ReadinessUnavailableChecksResponse })
  checks!: ReadinessUnavailableChecksResponse;

  @ApiProperty({
    description: "Human-readable readiness failure reason.",
    example: "Database connection is not ready.",
  })
  message!: string;
}

@Controller()
export class AppController {
  constructor(
    @Inject(BuildInfoService) private readonly buildInfoService: BuildInfoService,
    @Inject(DatabaseReadinessService)
    private readonly databaseReadinessService: DatabaseReadinessService
  ) {}

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
    return {
      service: "easygen-api",
      scope: "process",
      status: "ok",
      uptimeSeconds: Math.floor(process.uptime()),
    };
  }

  @Get("ping")
  @ApiTags("ping")
  @ApiOperation({
    summary: "API ping",
    description: "Returns a minimal public response for lightweight API reachability checks.",
  })
  @ApiOkResponse({
    description: "API is reachable.",
    type: PingResponse,
  })
  getPing(): PingResponse {
    return {
      status: "ok",
      service: "easygen-api",
      purpose: "reachability",
      transport: "http",
    };
  }

  @Get("status")
  @ApiTags("status")
  @ApiOperation({
    summary: "Public build status",
    description:
      "Returns public service, version, environment, and source metadata for unauthenticated diagnostics.",
  })
  @ApiOkResponse({
    description: "Current public service build metadata.",
    type: BuildInfoResponse,
  })
  getStatus(): BuildInfoResponse {
    return this.buildInfoService.getBuildInfo();
  }

  @Get("ready")
  @ApiTags("ready")
  @ApiOperation({
    summary: "Readiness check",
    description: "Checks whether required backing services are ready to serve API traffic.",
  })
  @ApiOkResponse({
    description: "Required backing services are ready.",
    type: ReadinessResponse,
  })
  @ApiServiceUnavailableResponse({
    description: "A required backing service is not ready.",
    type: ReadinessUnavailableResponse,
  })
  getReady(): DatabaseReadyResponse {
    return this.databaseReadinessService.getReadiness();
  }
}
