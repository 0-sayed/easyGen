import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  passwordResetConfirmSchema,
  passwordResetRequestSchema,
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

describe("passwordResetRequestSchema", () => {
  it("accepts a valid reset request email", () => {
    expect(passwordResetRequestSchema.safeParse({ email: "person@example.com" }).success).toBe(
      true
    );
  });

  it("rejects an invalid reset request email", () => {
    const result = passwordResetRequestSchema.safeParse({ email: "invalid" });

    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = z.treeifyError(result.error);

      expect(errors.properties?.email?.errors).toContain("Enter a valid email address.");
    }
  });
});

describe("passwordResetConfirmSchema", () => {
  it("accepts a matching strong password and reset token", () => {
    expect(
      passwordResetConfirmSchema.safeParse({
        email: "person@example.com",
        token: "reset-token-123",
        newPassword: "NewPassword1!",
        confirmPassword: "NewPassword1!",
      }).success
    ).toBe(true);
  });

  it("rejects missing token, weak password, and mismatched confirmation", () => {
    const result = passwordResetConfirmSchema.safeParse({
      email: "person@example.com",
      token: "",
      newPassword: "password",
      confirmPassword: "different",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = z.treeifyError(result.error);

      expect(errors.properties?.token?.errors).toContain("Reset token is required.");
      expect(errors.properties?.newPassword?.errors).toContain(
        "Password must be at least 8 characters and include a letter, a number, and a special character."
      );
      expect(errors.properties?.confirmPassword?.errors).toContain("Passwords must match.");
    }
  });
});
