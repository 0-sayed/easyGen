import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  PASSWORD_POLICY_MESSAGE,
  passwordChangeSchema,
  profileUpdateSchema,
  signinSchema,
  signupSchema,
} from "./validation";

describe("signupSchema", () => {
  it("accepts valid signup input", () => {
    expect(
      signupSchema.safeParse({
        email: "person@example.com",
        name: "Person Name",
        password: "Password1!",
      }).success
    ).toBe(true);
  });

  it("rejects invalid email, short name, and weak password", () => {
    const result = signupSchema.safeParse({
      email: "invalid",
      name: "Jo",
      password: "password",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = z.treeifyError(result.error);

      expect(errors.properties?.email?.errors).toContain("Enter a valid email address.");
      expect(errors.properties?.name?.errors).toContain("Name must be at least 3 characters.");
      expect(errors.properties?.password?.errors).toContain(
        "Password must be at least 8 characters and include a letter, a number, and a special character."
      );
    }
  });
});

describe("signinSchema", () => {
  it("accepts valid signin input", () => {
    expect(
      signinSchema.safeParse({
        email: "person@example.com",
        password: "Password1!",
      }).success
    ).toBe(true);
  });
});

describe("account settings validation", () => {
  it("accepts valid profile and password settings input", () => {
    expect(profileUpdateSchema.safeParse({ name: "Updated Person" }).success).toBe(true);
    expect(
      passwordChangeSchema.safeParse({
        currentPassword: "Password1!",
        newPassword: "NewPassword1!",
        confirmNewPassword: "NewPassword1!",
      }).success
    ).toBe(true);
  });

  it("rejects short profile names and invalid password changes", () => {
    const profileResult = profileUpdateSchema.safeParse({ name: "Al" });
    const passwordResult = passwordChangeSchema.safeParse({
      currentPassword: "",
      newPassword: "weak",
      confirmNewPassword: "different",
    });

    expect(profileResult.success).toBe(false);
    if (!profileResult.success) {
      const profileErrors = z.treeifyError(profileResult.error);

      expect(profileErrors.properties?.name?.errors).toContain(
        "Name must be at least 3 characters."
      );
    }

    expect(passwordResult.success).toBe(false);
    if (!passwordResult.success) {
      const passwordErrors = z.treeifyError(passwordResult.error);

      expect(passwordErrors.properties?.currentPassword?.errors).toContain(
        "Current password is required."
      );
      expect(passwordErrors.properties?.newPassword?.errors).toContain(PASSWORD_POLICY_MESSAGE);
      expect(passwordErrors.properties?.confirmNewPassword?.errors).toContain(
        "Password confirmation must match the new password."
      );
    }
  });

  it("trims profile names before validating length", () => {
    const whitespaceResult = profileUpdateSchema.safeParse({ name: "   " });
    const paddedResult = profileUpdateSchema.safeParse({ name: "  Person Name  " });

    expect(whitespaceResult.success).toBe(false);
    if (!whitespaceResult.success) {
      const profileErrors = z.treeifyError(whitespaceResult.error);

      expect(profileErrors.properties?.name?.errors).toContain(
        "Name must be at least 3 characters."
      );
    }

    expect(paddedResult.success).toBe(true);
    if (paddedResult.success) {
      expect(paddedResult.data.name).toBe("Person Name");
    }
  });
});
