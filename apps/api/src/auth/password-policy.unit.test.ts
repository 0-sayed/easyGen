import { describe, expect, it } from "vitest";

import { PASSWORD_PATTERN } from "./password-policy";

describe("PASSWORD_PATTERN", () => {
  it.each(["Password1!", "aB345678$", "Valid.pass9"])("accepts %s", (password) => {
    expect(PASSWORD_PATTERN.test(password)).toBe(true);
  });

  it.each(["short1!", "password!", "Password", "Password1", "12345678!"])(
    "rejects %s",
    (password) => {
      expect(PASSWORD_PATTERN.test(password)).toBe(false);
    }
  );
});
