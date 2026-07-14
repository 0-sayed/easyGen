import { describe, expect, it } from "vitest";

import { resolvePort } from "./port";

describe("resolvePort", () => {
  const portRangeError = "PORT must be a positive integer between 1 and 65535.";

  it("uses the default port when the environment value is absent", () => {
    expect(resolvePort(undefined, 3000, "PORT")).toBe(3000);
  });

  it("parses a configured positive integer port", () => {
    expect(resolvePort("4000", 3000, "PORT")).toBe(4000);
  });

  it.each([
    ["minimum valid port", "1", 1],
    ["maximum valid port", "65535", 65_535],
  ])("accepts the %s", (_caseName, configuredPort, expectedPort) => {
    expect(resolvePort(configuredPort, 3000, "PORT")).toBe(expectedPort);
  });

  it("accepts surrounding whitespace around a configured valid port", () => {
    expect(resolvePort("  4000\n", 3000, "PORT")).toBe(4000);
  });

  it("rejects malformed configured ports", () => {
    expect(() => resolvePort("abc", 3000, "PORT")).toThrow(portRangeError);
  });

  it.each([
    ["zero", "0"],
    ["above the maximum valid port", "65536"],
  ])("rejects %s", (_caseName, configuredPort) => {
    expect(() => resolvePort(configuredPort, 3000, "PORT")).toThrow(portRangeError);
  });
});
