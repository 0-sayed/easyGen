import { ApiClientError, apiRequest } from "../api/client";

export interface BuildInfo {
  service: "easygen-api";
  version: string;
  environment: string;
}

export interface HealthInfo {
  status: "ok";
  service: "easygen-api";
  scope: "process";
  uptimeSeconds: number;
}

export async function getBuildInfo(): Promise<BuildInfo> {
  return readBuildInfo(await apiRequest("/status"));
}

export async function getHealthInfo(): Promise<HealthInfo> {
  return readHealthInfo(await apiRequest("/health"));
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

function readHealthInfo(body: unknown): HealthInfo {
  if (
    !isObject(body) ||
    body.status !== "ok" ||
    body.service !== "easygen-api" ||
    body.scope !== "process" ||
    typeof body.uptimeSeconds !== "number" ||
    !Number.isInteger(body.uptimeSeconds) ||
    body.uptimeSeconds < 0
  ) {
    throw new ApiClientError("Unexpected API health response.", "unexpected");
  }

  return {
    status: body.status,
    service: body.service,
    scope: body.scope,
    uptimeSeconds: body.uptimeSeconds,
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
