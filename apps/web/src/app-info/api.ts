import { API_URL } from "../api/base-url";

export interface AppInfo {
  name: string;
  status: "ok";
  auth: {
    signup: boolean;
    signin: boolean;
  };
}

export async function getAppInfo(): Promise<AppInfo> {
  const response = await fetch(`${API_URL}/app-info`);

  if (!response.ok) {
    throw new Error("Unable to load app info.");
  }

  return readAppInfo(await response.json());
}

function readAppInfo(body: unknown): AppInfo {
  if (!isObject(body) || typeof body.name !== "string" || body.status !== "ok") {
    throw new Error("Unexpected app info response.");
  }

  if (!isObject(body.auth)) {
    throw new Error("Unexpected app info response.");
  }

  if (typeof body.auth.signup !== "boolean" || typeof body.auth.signin !== "boolean") {
    throw new Error("Unexpected app info response.");
  }

  return {
    name: body.name,
    status: body.status,
    auth: {
      signup: body.auth.signup,
      signin: body.auth.signin,
    },
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
