import { describe, expect, it } from "vitest";

import { resolvePort } from "./port";

describe("resolvePort", () => {
  it("uses the default port when the environment value is absent", () => {
    expect(resolvePort(undefined, 3000, "PORT")).toBe(3000);
  });

  it("parses a configured positive integer port", () => {
    expect(resolvePort("4000", 3000, "PORT")).toBe(4000);
  });

  it("rejects malformed configured ports", () => {
    expect(() => resolvePort("abc", 3000, "PORT")).toThrow(
      "PORT must be a positive integer between 1 and 65535."
    );
  });
});
