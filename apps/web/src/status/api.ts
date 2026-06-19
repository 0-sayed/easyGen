const DEFAULT_API_URL = "http://127.0.0.1:3000";
const API_URL = getApiUrl(import.meta.env);

export interface BuildInfo {
  service: "easygen-api";
  version: string;
  environment: string;
}

export async function getBuildInfo(): Promise<BuildInfo> {
  const response = await fetch(`${API_URL}/status`);

  if (!response.ok) {
    throw new Error("Unable to load API status.");
  }

  return readBuildInfo(await readJson(response));
}

function getApiUrl(env: ImportMetaEnv): string {
  const apiUrl = env.VITE_API_URL?.trim();
  return apiUrl === undefined || apiUrl.length === 0 ? DEFAULT_API_URL : apiUrl;
}

function readBuildInfo(body: unknown): BuildInfo {
  if (
    !isObject(body) ||
    body.service !== "easygen-api" ||
    typeof body.version !== "string" ||
    typeof body.environment !== "string"
  ) {
    throw new Error("Unexpected API status response.");
  }

  return {
    service: body.service,
    version: body.version,
    environment: body.environment,
  };
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new Error("Unexpected API status response.");
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
