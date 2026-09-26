import type { Request, Response } from "express";
import { prisma } from "../config/db.js";
import { TaskPriority, TaskStatus } from "../generated/prisma/client.js";
import { ApiResponse } from "../utils/api-response.js";
import { getDashboardCache, setDashboardCache } from "../utils/cache.js";
import { publicUserSelect } from "../utils/selects.js";
import type { ProjectParams } from "../validators/project.validator.js";

type GroupCount<K extends string> = { _count: { _all: number } } & Record<
  K,
  string
>;

// groupBy only returns groups that have rows, so values with no tasks are filled in with 0.
const countsFor = <K extends string>(
  values: string[],
  groups: GroupCount<K>[],
  key: K,
) =>
  Object.fromEntries(
    values.map((value) => [
      value,
      groups.find((group) => group[key] === value)?._count._all ?? 0,
    ]),
  );

const computeDashboard = async (projectId: string) => {
  const openTask = { projectId, status: { not: TaskStatus.DONE } };

  const [
    totalTasks,
    byStatus,
    byPriority,
    overdueTasks,
    openByAssignee,
    memberCount,
  ] = await Promise.all([
    prisma.task.count({ where: { projectId } }),
    prisma.task.groupBy({
      by: ["status"],
      where: { projectId },
      _count: { _all: true },
    }),
    prisma.task.groupBy({
      by: ["priority"],
      where: { projectId },
      _count: { _all: true },
    }),
    prisma.task.count({ where: { ...openTask, dueDate: { lt: new Date() } } }),
    prisma.task.groupBy({
      by: ["assignedToId"],
      where: { ...openTask, assignedToId: { not: null } },
      _count: { _all: true },
    }),
    prisma.projectMember.count({ where: { projectId } }),
  ]);

  const assignees = await prisma.user.findMany({
    where: {
      id: { in: openByAssignee.map((group) => group.assignedToId as string) },
    },
    select: publicUserSelect,
  });
  const openTasksByAssignee = openByAssignee
    .map((group) => ({
      user: assignees.find((user) => user.id === group.assignedToId),
      openTasks: group._count._all,
    }))
    .sort((a, b) => b.openTasks - a.openTasks);

  return {
    totalTasks,
    tasksByStatus: countsFor(Object.values(TaskStatus), byStatus, "status"),
    tasksByPriority: countsFor(
      Object.values(TaskPriority),
      byPriority,
      "priority",
    ),
    overdueTasks,
    openTasksByAssignee,
    memberCount,
  };
};

// Cache-aside: serve from Redis when possible, otherwise compute and store for next time.
export const getDashboard = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { projectId } = req.params as ProjectParams;

  const cached = await getDashboardCache(projectId);
  if (cached) {
    res
      .status(200)
      .json(new ApiResponse(200, cached, "Dashboard fetched successfully"));
    return;
  }

  const dashboard = await computeDashboard(projectId);
  await setDashboardCache(projectId, dashboard);

  res
    .status(200)
    .json(new ApiResponse(200, dashboard, "Dashboard fetched successfully"));
};
