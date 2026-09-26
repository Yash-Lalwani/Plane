import type { Request, Response } from "express";
import { prisma } from "../config/db.js";
import { redis } from "../config/redis.js";
import { ApiResponse } from "../utils/api-response.js";

const isDatabaseUp = async (): Promise<boolean> => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
};

const isRedisUp = async (): Promise<boolean> => {
  try {
    return (await redis.ping()) === "PONG";
  } catch {
    return false;
  }
};

export const healthcheck = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  const [databaseUp, redisUp] = await Promise.all([
    isDatabaseUp(),
    isRedisUp(),
  ]);
  const healthy = databaseUp && redisUp;
  const statusCode = healthy ? 200 : 503;

  const data = {
    api: "up",
    database: databaseUp ? "up" : "down",
    redis: redisUp ? "up" : "down",
  };

  res
    .status(statusCode)
    .json(
      new ApiResponse(
        statusCode,
        data,
        healthy ? "Service is healthy" : "Service is unhealthy",
      ),
    );
};
