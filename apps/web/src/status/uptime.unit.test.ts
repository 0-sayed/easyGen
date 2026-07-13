import { describe, expect, it } from "vitest";

import { formatUptime } from "./uptime";

describe("formatUptime", () => {
  it("renders sub-minute uptime without raw seconds", () => {
    expect(formatUptime(0)).toBe("< 1 minute");
    expect(formatUptime(59)).toBe("< 1 minute");
  });

  it("renders minute-level uptime", () => {
    expect(formatUptime(60)).toBe("1 minute");
    expect(formatUptime(125)).toBe("2 minutes");
  });

  it("renders hour-level uptime", () => {
    expect(formatUptime(3_600)).toBe("1 hour");
    expect(formatUptime(7_200)).toBe("2 hours");
  });

  it("renders day-level uptime", () => {
    expect(formatUptime(86_400)).toBe("1 day");
    expect(formatUptime(172_800)).toBe("2 days");
  });
});
