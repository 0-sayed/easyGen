import { randomUUID } from "node:crypto";
import type { IncomingHttpHeaders } from "node:http";

const CORRELATION_ID_HEADER = "x-correlation-id";

const CORRELATION_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/-]{7,127}$/;

interface CorrelationRequest {
  headers: IncomingHttpHeaders;
}

interface CorrelationResponse {
  setHeader(name: string, value: string): unknown;
}

function normalizeCorrelationId(value: IncomingHttpHeaders[string]): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const candidate = value.trim();

  if (candidate.includes(",") || !CORRELATION_ID_PATTERN.test(candidate)) {
    return undefined;
  }

  return candidate;
}

export function createCorrelationId(
  request: CorrelationRequest,
  response: CorrelationResponse
): string {
  const correlationId =
    normalizeCorrelationId(request.headers[CORRELATION_ID_HEADER]) ?? randomUUID();

  response.setHeader(CORRELATION_ID_HEADER, correlationId);

  return correlationId;
}
