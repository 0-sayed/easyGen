import { ApiClientError, apiRequest } from "../api/client";

export interface BuildInfo {
  service: "easygen-api";
  version: string;
  environment: string;
}

export async function getBuildInfo(): Promise<BuildInfo> {
  return readBuildInfo(await apiRequest("/status"));
}

function readBuildInfo(body: unknown): BuildInfo {
  if (
    !isObject(body) ||
    body.service !== "easygen-api" ||
    typeof body.version !== "string" ||
    typeof body.environment !== "string"
  ) {
    throw new ApiClientError("Unexpected API status response.", "unexpected");
  }

  return {
    service: body.service,
    version: body.version,
    environment: body.environment,
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
