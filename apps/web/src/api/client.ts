const DEFAULT_API_URL = "http://127.0.0.1:3000";
const FALLBACK_MESSAGE = "Something went wrong. Please try again.";
const NETWORK_MESSAGE = "Unable to reach the API. Please try again.";

export type ApiErrorCategory =
  | "validation"
  | "unauthorized"
  | "conflict"
  | "throttled"
  | "unavailable"
  | "unexpected";

export class ApiClientError extends Error {
  readonly category: ApiErrorCategory;
  readonly status?: number;

  constructor(message: string, category: ApiErrorCategory, status?: number) {
    super(message);
    this.name = "ApiClientError";
    this.category = category;
    this.status = status;
  }
}

export function isApiClientError(error: unknown): error is ApiClientError {
  return (
    error instanceof Error &&
    error.name === "ApiClientError" &&
    "category" in error &&
    isApiErrorCategory(error.category)
  );
}

export function getApiUrl(env: ImportMetaEnv): string {
  const apiUrl = env.VITE_API_URL?.trim();
  return apiUrl === undefined || apiUrl.length === 0 ? DEFAULT_API_URL : apiUrl;
}

export async function apiRequest(path: string, init: RequestInit = {}): Promise<unknown> {
  try {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const response = await fetch(`${getApiUrl(import.meta.env)}${normalizedPath}`, init);

    if (!response.ok) {
      throw new ApiClientError(
        await readErrorMessage(response),
        getErrorCategory(response.status),
        response.status
      );
    }

    const text = await response.text();
    if (text.length === 0) {
      return null;
    }

    try {
      return JSON.parse(text) as unknown;
    } catch {
      throw new ApiClientError(FALLBACK_MESSAGE, "unexpected", response.status);
    }
  } catch (error) {
    if (isApiClientError(error)) {
      throw error;
    }

    throw new ApiClientError(NETWORK_MESSAGE, "unavailable");
  }
}

function getErrorCategory(status: number): ApiErrorCategory {
  switch (status) {
    case 400:
      return "validation";
    case 401:
      return "unauthorized";
    case 409:
      return "conflict";
    case 429:
      return "throttled";
    case 503:
      return "unavailable";
    default:
      return "unexpected";
  }
}

function isApiErrorCategory(value: unknown): value is ApiErrorCategory {
  return (
    value === "validation" ||
    value === "unauthorized" ||
    value === "conflict" ||
    value === "throttled" ||
    value === "unavailable" ||
    value === "unexpected"
  );
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const contentType = response.headers.get("Content-Type");
    if (contentType?.includes("application/json")) {
      const body: unknown = await response.json();
      return isObject(body) ? normalizeMessage(body.message) : FALLBACK_MESSAGE;
    }

    const text = await response.text();
    return text.trim() || FALLBACK_MESSAGE;
  } catch {
    return FALLBACK_MESSAGE;
  }
}

function normalizeMessage(message: unknown): string {
  if (typeof message === "string" && message.length > 0) {
    return message;
  }

  if (
    Array.isArray(message) &&
    message.length > 0 &&
    message.every((item) => typeof item === "string" && item.length > 0)
  ) {
    return message.join(" ");
  }

  return FALLBACK_MESSAGE;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
