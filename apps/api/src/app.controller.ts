import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";

interface HealthResponse {
  status: "ok";
}

interface AppInfoResponse {
  name: "easyGen";
  status: "ok";
  auth: {
    signup: true;
    signin: true;
  };
}

@Controller()
export class AppController {
  @Get("health")
  @ApiTags("health")
  @ApiOkResponse({ description: "API health check." })
  getHealth(): HealthResponse {
    return { status: "ok" };
  }

  @Get("app-info")
  @ApiTags("app")
  @ApiOkResponse({ description: "Public application information." })
  getAppInfo(): AppInfoResponse {
    return {
      name: "easyGen",
      status: "ok",
      auth: {
        signup: true,
        signin: true,
      },
    };
  }
}
