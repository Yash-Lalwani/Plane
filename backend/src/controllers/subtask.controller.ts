import type { Request, Response } from "express";
import { prisma } from "../config/db.js";
import { ProjectRole } from "../generated/prisma/client.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { findTaskOrThrow } from "../utils/find-task.js";
import type {
  CreateSubtaskInput,
  SubtaskParams,
  UpdateSubtaskInput,
} from "../validators/subtask.validator.js";
import type { TaskParams } from "../validators/task.validator.js";

const findSubtaskOrThrow = async ({
  projectId,
  taskId,
  subtaskId,
}: SubtaskParams) => {
  const subtask = await prisma.subtask.findFirst({
    where: { id: subtaskId, taskId, task: { projectId } },
  });
  if (!subtask) {
    throw new ApiError(404, "Subtask not found");
  }
  return subtask;
};

export const createSubtask = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { projectId, taskId } = req.params as TaskParams;
  const { title } = req.body as CreateSubtaskInput;

  const task = await findTaskOrThrow(projectId, taskId);
  const subtask = await prisma.subtask.create({
    data: { taskId: task.id, title, createdById: req.user.id },
  });

  res
    .status(201)
    .json(new ApiResponse(201, subtask, "Subtask created successfully"));
};

export const updateSubtask = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const params = req.params as SubtaskParams;
  const { title, isCompleted } = req.body as UpdateSubtaskInput;

  // Every member may tick a subtask off, but only Admins and Project Admins may rename it.
  if (title !== undefined && req.projectMember.role === ProjectRole.MEMBER) {
    throw new ApiError(
      403,
      "Members can only change whether a subtask is completed",
    );
  }

  const subtask = await findSubtaskOrThrow(params);
  const updated = await prisma.subtask.update({
    where: { id: subtask.id },
    data: { title, isCompleted },
  });

  res
    .status(200)
    .json(new ApiResponse(200, updated, "Subtask updated successfully"));
};

export const deleteSubtask = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const subtask = await findSubtaskOrThrow(req.params as SubtaskParams);

  await prisma.subtask.delete({ where: { id: subtask.id } });

  res
    .status(200)
    .json(new ApiResponse(200, null, "Subtask deleted successfully"));
};
