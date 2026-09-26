import { rateLimit } from "express-rate-limit";
import { env } from "../config/env.js";
import { ApiError } from "../utils/api-error.js";

// Each call creates a separate limiter, so every auth route gets its own budget per IP.
export const authRateLimit = () =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    // Tests log in many times from the same IP.
    skip: () => env.NODE_ENV === "test",
    handler: (_req, _res, next) => {
      next(new ApiError(429, "Too many requests, please try again later"));
    },
  });
