import { describe, expect, it } from "vitest";

import { buildFallbackMongodbUri } from "./database.module";

describe("buildFallbackMongodbUri", () => {
  it("uses the configured MongoDB port in the fallback local URI", () => {
    expect(buildFallbackMongodbUri("37018")).toBe(
      "mongodb://127.0.0.1:37018/easygen?directConnection=true"
    );
  });
});
