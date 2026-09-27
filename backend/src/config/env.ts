import dotenv from "dotenv";
import { z } from "zod";

dotenv.config({ quiet: true });

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    PORT: z.coerce.number().int().positive().default(8000),
    LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
      .default("info"),

    DATABASE_URL: z.url(),
    REDIS_URL: z.url(),

    CLIENT_URL: z.url(),
    CORS_ORIGIN: z.url(),
    // Optional. Empty means host-only cookies (always the case locally).
    COOKIE_DOMAIN: z.string().optional(),

    ACCESS_TOKEN_SECRET: z.string().min(1),
    ACCESS_TOKEN_EXPIRY: z.string().min(1).default("15m"),
    REFRESH_TOKEN_SECRET: z.string().min(1),
    REFRESH_TOKEN_EXPIRY: z.string().min(1).default("7d"),

    RESEND_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().min(1),

    CLOUDINARY_CLOUD_NAME: z.string().min(1),
    CLOUDINARY_API_KEY: z.string().min(1),
    CLOUDINARY_API_SECRET: z.string().min(1),
  })
  .refine(
    (env) => env.NODE_ENV === "development" || Boolean(env.RESEND_API_KEY),
    {
      path: ["RESEND_API_KEY"],
      message: "Required outside development",
    },
  );

const result = envSchema.safeParse(process.env);

if (!result.success) {
  // The Pino logger depends on these variables, so it cannot be used yet.
  console.error("Invalid environment variables:");
  for (const issue of result.error.issues) {
    console.error(`  ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = result.data;
