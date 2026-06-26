import { z } from "zod";

const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

export const PASSWORD_POLICY_MESSAGE =
  "Password must be at least 8 characters and include a letter, a number, and a special character.";
export const PASSWORD_HELPER_MESSAGE = "Use 8+ characters with a letter, number, and symbol.";

export const signupSchema = z.object({
  email: z.email("Enter a valid email address."),
  name: z.string().min(3, "Name must be at least 3 characters."),
  password: z.string().regex(passwordPattern, PASSWORD_POLICY_MESSAGE),
});

export const signinSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

export const profileUpdateSchema = z.object({
  name: z.string().trim().min(3, "Name must be at least 3 characters."),
});

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required."),
    newPassword: z.string().regex(passwordPattern, PASSWORD_POLICY_MESSAGE),
    confirmNewPassword: z.string().min(1, "Password confirmation is required."),
  })
  .refine((value) => value.newPassword === value.confirmNewPassword, {
    message: "Password confirmation must match the new password.",
    path: ["confirmNewPassword"],
  });

export type SignupFormValues = z.infer<typeof signupSchema>;
export type SigninFormValues = z.infer<typeof signinSchema>;
export type ProfileUpdateFormValues = z.infer<typeof profileUpdateSchema>;
export type PasswordChangeFormValues = z.infer<typeof passwordChangeSchema>;

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}
