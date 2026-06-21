import { describe, expect, it } from "vitest";

import { buildLocalMongodbUri, validateAppConfig } from "./app-config";

describe("validateAppConfig", () => {
  it("keeps documented local defaults when JWT_SECRET is provided", () => {
    const config = validateAppConfig({ JWT_SECRET: "local-test-secret" });

    expect(config).toMatchObject({
      JWT_EXPIRES_IN: "15m",
      JWT_SECRET: "local-test-secret",
      LOG_LEVEL: "info",
      MONGODB_PORT: "27018",
      MONGODB_URI: "mongodb://127.0.0.1:27018/easygen?directConnection=true",
      PORT: "3000",
      WEB_PORT: "5173",
    });
  });

  it("accepts valid deployment-style overrides", () => {
    const config = validateAppConfig({
      JWT_EXPIRES_IN: "1h",
      JWT_SECRET: "deployment-secret",
      LOG_LEVEL: "warn",
      MONGODB_PORT: "37018",
      MONGODB_URI: "mongodb://mongo.example.test:27017/easygen",
      PORT: "8080",
      WEB_PORT: "4173",
    });

    expect(config).toMatchObject({
      JWT_EXPIRES_IN: "1h",
      JWT_SECRET: "deployment-secret",
      LOG_LEVEL: "warn",
      MONGODB_PORT: "37018",
      MONGODB_URI: "mongodb://mongo.example.test:27017/easygen",
      PORT: "8080",
      WEB_PORT: "4173",
    });
  });

  it.each([
    [{}, "JWT_SECRET is required."],
    [{ JWT_SECRET: "   " }, "JWT_SECRET is required."],
    [{ JWT_SECRET: "secret", PORT: "abc" }, "PORT must be a positive integer between 1 and 65535."],
    [
      { JWT_SECRET: "secret", WEB_PORT: "65536" },
      "WEB_PORT must be a positive integer between 1 and 65535.",
    ],
    [
      { JWT_SECRET: "secret", MONGODB_PORT: "0" },
      "MONGODB_PORT must be a positive integer between 1 and 65535.",
    ],
    [
      { JWT_SECRET: "secret", LOG_LEVEL: "verbose" },
      "LOG_LEVEL must be one of: trace, debug, info, warn, error, fatal, silent.",
    ],
    [
      { JWT_SECRET: "secret", JWT_EXPIRES_IN: "soon" },
      "JWT_EXPIRES_IN must be a duration such as 15m, 1h, or 7d.",
    ],
    [
      { JWT_SECRET: "secret", MONGODB_URI: "https://example.test" },
      "MONGODB_URI must use mongodb:// or mongodb+srv://.",
    ],
  ])("rejects invalid config %#", (input, expectedMessage) => {
    expect(() => validateAppConfig(input)).toThrow(expectedMessage);
  });
});

describe("buildLocalMongodbUri", () => {
  it("uses the configured MongoDB port in the fallback local URI", () => {
    expect(buildLocalMongodbUri("37018")).toBe(
      "mongodb://127.0.0.1:37018/easygen?directConnection=true"
    );
  });
});
