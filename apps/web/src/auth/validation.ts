import { z } from "zod";

const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

export const signupSchema = z.object({
  email: z.email("Enter a valid email address."),
  name: z.string().min(3, "Name must be at least 3 characters."),
  password: z
    .string()
    .regex(
      passwordPattern,
      "Password must be at least 8 characters and include a letter, a number, and a special character."
    ),
});

export const signinSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

export const passwordResetRequestSchema = z.object({
  email: z.email("Enter a valid email address."),
});

export const passwordResetConfirmSchema = z
  .object({
    email: z.email("Enter a valid email address."),
    token: z.string().min(1, "Reset token is required."),
    newPassword: z
      .string()
      .regex(
        passwordPattern,
        "Password must be at least 8 characters and include a letter, a number, and a special character."
      ),
    confirmPassword: z.string().min(1, "Confirm your new password."),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "Passwords must match.",
    path: ["confirmPassword"],
  });

export type SignupFormValues = z.infer<typeof signupSchema>;
export type SigninFormValues = z.infer<typeof signinSchema>;
export type PasswordResetRequestFormValues = z.infer<typeof passwordResetRequestSchema>;
export type PasswordResetConfirmFormValues = z.infer<typeof passwordResetConfirmSchema>;
