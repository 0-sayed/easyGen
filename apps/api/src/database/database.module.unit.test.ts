import { describe, expect, it } from "vitest";

import { buildLocalMongodbUri } from "../config/app-config";

describe("buildLocalMongodbUri", () => {
  it("uses the configured MongoDB port in the fallback local URI", () => {
    expect(buildLocalMongodbUri("37018")).toBe(
      "mongodb://127.0.0.1:37018/easygen?directConnection=true"
    );
  });
});
