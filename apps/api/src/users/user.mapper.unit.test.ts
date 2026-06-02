import { describe, expect, it } from "vitest";

import { toPublicUser } from "./user.mapper";

describe("toPublicUser", () => {
  it("returns only public user fields", () => {
    const publicUser = toPublicUser({
      email: "person@example.com",
      id: "507f1f77bcf86cd799439011",
      name: "Person Name",
      passwordHash: "hash-value",
    });

    expect(publicUser).toEqual({
      email: "person@example.com",
      id: "507f1f77bcf86cd799439011",
      name: "Person Name",
    });
    expect(publicUser).not.toHaveProperty("passwordHash");
  });
});
