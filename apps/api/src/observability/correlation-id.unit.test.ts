import { describe, expect, it } from "vitest";

import { createCorrelationId } from "./correlation-id";

function createResponse() {
  const headers = new Map<string, string>();
  const response = {
    setHeader(name: string, value: string) {
      headers.set(name, value);
    },
  };

  return { headers, response };
}

describe("createCorrelationId", () => {
  it("reuses a valid inbound correlation ID and writes it to the response", () => {
    const request = {
      headers: {
        "x-correlation-id": "trace-12345678",
      },
    };
    const { headers, response } = createResponse();

    const correlationId = createCorrelationId(request, response);

    expect(correlationId).toBe("trace-12345678");
    expect(headers.get("x-correlation-id")).toBe("trace-12345678");
  });

  it("reuses one valid correlation ID from a single-value array header", () => {
    const request = {
      headers: {
        "x-correlation-id": ["trace-12345678"],
      },
    };
    const { headers, response } = createResponse();

    const correlationId = createCorrelationId(request, response);

    expect(correlationId).toBe("trace-12345678");
    expect(headers.get("x-correlation-id")).toBe("trace-12345678");
  });

  it("replaces malformed inbound correlation IDs", () => {
    const request = {
      headers: {
        "x-correlation-id": "bad,id",
      },
    };
    const { headers, response } = createResponse();

    const correlationId = createCorrelationId(request, response);

    expect(correlationId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
    expect(headers.get("x-correlation-id")).toBe(correlationId);
  });
});
