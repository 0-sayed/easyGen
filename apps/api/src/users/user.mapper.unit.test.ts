import { describe, expect, it } from "vitest";

import { toPublicUser } from "./user.mapper";

describe("toPublicUser", () => {
  it("returns only public user fields", () => {
    const publicUser = toPublicUser({
      email: "person@example.com",
      emailVerified: true,
      emailVerifiedAt: null,
      id: "507f1f77bcf86cd799439011",
      name: "Person Name",
      passwordHash: "hash-value",
    });

    expect(publicUser).toEqual({
      email: "person@example.com",
      emailVerified: false,
      id: "507f1f77bcf86cd799439011",
      name: "Person Name",
    });
    expect(publicUser).not.toHaveProperty("passwordHash");
  });

  it("returns emailVerified true when emailVerifiedAt is a Date", () => {
    expect(
      toPublicUser({
        email: "person@example.com",
        emailVerified: false,
        emailVerifiedAt: new Date("2026-06-21T10:00:00.000Z"),
        id: "507f1f77bcf86cd799439011",
        name: "Person Name",
        passwordHash: "hash-value",
      })
    ).toEqual({
      email: "person@example.com",
      emailVerified: true,
      id: "507f1f77bcf86cd799439011",
      name: "Person Name",
    });
  });

  it("returns emailVerified false when emailVerifiedAt is null", () => {
    expect(
      toPublicUser({
        email: "person@example.com",
        emailVerified: true,
        emailVerifiedAt: null,
        id: "507f1f77bcf86cd799439011",
        name: "Person Name",
        passwordHash: "hash-value",
      })
    ).toEqual({
      email: "person@example.com",
      emailVerified: false,
      id: "507f1f77bcf86cd799439011",
      name: "Person Name",
    });
  });

  it("returns emailVerified false when emailVerifiedAt is omitted", () => {
    expect(
      toPublicUser({
        email: "person@example.com",
        emailVerified: true,
        id: "507f1f77bcf86cd799439011",
        name: "Person Name",
        passwordHash: "hash-value",
      })
    ).toEqual({
      email: "person@example.com",
      emailVerified: false,
      id: "507f1f77bcf86cd799439011",
      name: "Person Name",
    });
  });
});
