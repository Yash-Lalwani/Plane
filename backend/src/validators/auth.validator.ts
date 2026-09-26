import { z } from "zod";

// Trim and lowercase before the format check, so " Foo@Example.com " is accepted and stored lowercase.
export const emailSchema = z.string().trim().toLowerCase().pipe(z.email());

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(30)
  .regex(/^[a-z0-9_]+$/, "Only letters, numbers and underscores are allowed");

// bcrypt ignores everything after 72 bytes, so longer passwords are rejected.
export const passwordSchema = z.string().min(8).max(72);

export const fullNameSchema = z.string().trim().min(1).max(100);

export const registerSchema = z.object({
  email: emailSchema,
  username: usernameSchema,
  password: passwordSchema,
  fullName: fullNameSchema.optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1).optional(),
});

export const tokenParamSchema = z.object({
  token: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  password: passwordSchema,
});

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1),
  newPassword: passwordSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type TokenParams = z.infer<typeof tokenParamSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
