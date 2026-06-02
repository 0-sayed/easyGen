import { beforeEach, describe, expect, it } from "vitest";

import { clearAccessToken, getAccessToken, setAccessToken } from "./session";

describe("session token storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("stores and returns the access token", () => {
    setAccessToken("abc.123");

    expect(getAccessToken()).toBe("abc.123");
  });

  it("returns null when no token exists", () => {
    expect(getAccessToken()).toBeNull();
  });

  it("clears the access token", () => {
    setAccessToken("abc.123");
    clearAccessToken();

    expect(getAccessToken()).toBeNull();
  });
});
