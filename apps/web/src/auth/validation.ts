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

export const emailVerificationRequestSchema = z.object({
  email: z.email("Enter a valid email address."),
});

export type SignupFormValues = z.infer<typeof signupSchema>;
export type SigninFormValues = z.infer<typeof signinSchema>;
export type EmailVerificationRequestFormValues = z.infer<typeof emailVerificationRequestSchema>;
