import type { Request } from "express";

export interface AuthRequestContext {
  correlationId?: string;
  email?: string;
  ip?: string;
  userAgent?: string;
}

export function buildAuthRequestContext(request: Request, email: string): AuthRequestContext {
  return {
    ...buildTokenRequestContext(request),
    email,
  };
}

export function buildTokenRequestContext(request: Request): Omit<AuthRequestContext, "email"> {
  return {
    correlationId: getCorrelationId(request),
    ip: getRequestIp(request),
    userAgent: getSingleNonEmptyHeader(request, "user-agent"),
  };
}

function getCorrelationId(request: Request): string | undefined {
  if (typeof request.id === "string" && request.id.trim() !== "") {
    return request.id;
  }

  return getSingleNonEmptyHeader(request, "x-correlation-id");
}

function getRequestIp(request: Request): string | undefined {
  if (typeof request.ip !== "string") {
    return undefined;
  }

  const ip = request.ip.trim();
  return ip === "" ? undefined : ip;
}

function getSingleNonEmptyHeader(request: Request, name: string): string | undefined {
  const value = request.headers[name];

  if (typeof value === "string") {
    const header = value.trim();
    return header === "" ? undefined : header;
  }

  if (Array.isArray(value) && value.length === 1) {
    const [headerValue] = value;
    if (typeof headerValue === "string") {
      const header = headerValue.trim();
      return header === "" ? undefined : header;
    }
  }

  return undefined;
}
