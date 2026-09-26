import { logger } from "../config/logger.js";
import { redis } from "../config/redis.js";

const DASHBOARD_TTL_SECONDS = 60;

const dashboardKey = (projectId: string) => `project:${projectId}:dashboard`;

// Every function treats a Redis error as a cache miss: the dashboard is then computed from
// the database, so Redis being down never breaks a request.

export const getDashboardCache = async (
  projectId: string,
): Promise<unknown> => {
  try {
    const cached = await redis.get(dashboardKey(projectId));
    return cached ? (JSON.parse(cached) as unknown) : null;
  } catch (error) {
    logger.warn({ err: error, projectId }, "Failed to read dashboard cache");
    return null;
  }
};

export const setDashboardCache = async (
  projectId: string,
  data: unknown,
): Promise<void> => {
  try {
    await redis.set(
      dashboardKey(projectId),
      JSON.stringify(data),
      "EX",
      DASHBOARD_TTL_SECONDS,
    );
  } catch (error) {
    logger.warn({ err: error, projectId }, "Failed to write dashboard cache");
  }
};

export const invalidateDashboardCache = async (
  projectId: string,
): Promise<void> => {
  try {
    await redis.del(dashboardKey(projectId));
  } catch (error) {
    logger.warn(
      { err: error, projectId },
      "Failed to invalidate dashboard cache",
    );
  }
};
