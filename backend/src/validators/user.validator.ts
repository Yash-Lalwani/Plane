import { z } from "zod";
import { fullNameSchema, usernameSchema } from "./auth.validator.js";

export const updateProfileSchema = z
  .object({
    fullName: fullNameSchema.nullable().optional(),
    username: usernameSchema.optional(),
  })
  .refine(
    (data) => data.fullName !== undefined || data.username !== undefined,
    {
      message: "Provide fullName or username",
    },
  );

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
