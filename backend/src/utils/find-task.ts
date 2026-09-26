import { prisma } from "../config/db.js";
import { ApiError } from "./api-error.js";

// Looks the task up inside the project from the URL, so a task that belongs to another
// project is a 404 even if its id exists.
export const findTaskOrThrow = async (projectId: string, taskId: string) => {
  const task = await prisma.task.findFirst({
    where: { id: taskId, projectId },
  });
  if (!task) {
    throw new ApiError(404, "Task not found");
  }
  return task;
};
