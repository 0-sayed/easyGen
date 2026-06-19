/* global process */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const themeCss = readFileSync(join(process.cwd(), "src/index.css"), "utf8");

function getThemeColor(name) {
  const match = new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6});`).exec(themeCss);

  if (!match?.[1]) {
    throw new Error(`Missing theme color: ${name}`);
  }

  return match[1].toLowerCase();
}

describe("theme colors", () => {
  it("uses a darker blue for the brand hover color", () => {
    expect(getThemeColor("brand")).toBe("#2563eb");
    expect(getThemeColor("brand-strong")).toBe("#1d4ed8");
  });
});
