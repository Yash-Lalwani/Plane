import { Redis } from "ioredis";
import { env } from "./env.js";
import { logger } from "./logger.js";

// Fail a command after one reconnect attempt instead of waiting forever,
// so a Redis outage turns into a quick error the caller can handle.
export const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 1 });

redis.on("error", (error) => {
  logger.warn({ err: error }, "Redis connection error");
});
