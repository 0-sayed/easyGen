import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";

interface HealthResponse {
  status: "ok";
}

@ApiTags("health")
@Controller()
export class AppController {
  @Get("health")
  @ApiOkResponse({ description: "API health check." })
  getHealth(): HealthResponse {
    return { status: "ok" };
  }
}
