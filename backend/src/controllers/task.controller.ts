import type { Request, Response } from "express";
import { prisma } from "../config/db.js";
import { type Prisma, TaskStatus } from "../generated/prisma/client.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { deleteFile } from "../utils/file-storage.js";
import { findTaskOrThrow } from "../utils/find-task.js";
import { buildPaginatedData, getSkipTake } from "../utils/pagination.js";
import { publicUserSelect } from "../utils/selects.js";
import type { ProjectParams } from "../validators/project.validator.js";
import type {
  CreateTaskInput,
  ListTasksQuery,
  TaskParams,
  UpdateTaskInput,
} from "../validators/task.validator.js";

const taskListInclude = {
  assignedTo: { select: publicUserSelect },
  createdBy: { select: publicUserSelect },
} satisfies Prisma.TaskInclude;

const taskDetailInclude = {
  ...taskListInclude,
  subtasks: { orderBy: { createdAt: "asc" } },
  attachments: { orderBy: { createdAt: "asc" } },
  _count: { select: { comments: true } },
} satisfies Prisma.TaskInclude;

const getTaskDetail = async (taskId: string) => {
  const { _count, ...task } = await prisma.task.findUniqueOrThrow({
    where: { id: taskId },
    include: taskDetailInclude,
  });
  return { ...task, commentCount: _count.comments };
};

const ensureAssigneeIsMember = async (
  projectId: string,
  userId: string,
): Promise<void> => {
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  if (!member) {
    throw new ApiError(400, "Assignee must be a member of this project");
  }
};

const buildTaskOrderBy = ({
  sortBy,
  order,
}: ListTasksQuery): Prisma.TaskOrderByWithRelationInput[] => {
  const primary: Prisma.TaskOrderByWithRelationInput =
    sortBy === "dueDate"
      ? { dueDate: { sort: order, nulls: "last" } }
      : sortBy === "priority"
        ? { priority: order }
        : { createdAt: order };
  // Sorting by id as well keeps the order stable when values tie, so pages never overlap.
  return [primary, { id: "asc" }];
};

export const listTasks = async (req: Request, res: Response): Promise<void> => {
  const { projectId } = req.params as ProjectParams;
  const query = req.validatedQuery as ListTasksQuery;

  const where: Prisma.TaskWhereInput = {
    projectId,
    status: query.status,
    priority: query.priority,
    assignedToId: query.assignedTo === "me" ? req.user.id : query.assignedTo,
    title: query.search
      ? { contains: query.search, mode: "insensitive" }
      : undefined,
  };
  if (query.overdue === "true") {
    where.AND = [
      { dueDate: { lt: new Date() } },
      { status: { not: TaskStatus.DONE } },
    ];
  }

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      include: taskListInclude,
      orderBy: buildTaskOrderBy(query),
      ...getSkipTake(query),
    }),
    prisma.task.count({ where }),
  ]);

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        buildPaginatedData(tasks, total, query),
        "Tasks fetched successfully",
      ),
    );
};

export const createTask = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { projectId } = req.params as ProjectParams;
  const input = req.body as CreateTaskInput;

  if (input.assignedToId) {
    await ensureAssigneeIsMember(projectId, input.assignedToId);
  }

  const task = await prisma.task.create({
    data: { ...input, projectId, createdById: req.user.id },
  });

  res
    .status(201)
    .json(
      new ApiResponse(
        201,
        await getTaskDetail(task.id),
        "Task created successfully",
      ),
    );
};

export const getTask = async (req: Request, res: Response): Promise<void> => {
  const { projectId, taskId } = req.params as TaskParams;

  const task = await findTaskOrThrow(projectId, taskId);

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        await getTaskDetail(task.id),
        "Task fetched successfully",
      ),
    );
};

export const updateTask = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { projectId, taskId } = req.params as TaskParams;
  const input = req.body as UpdateTaskInput;

  const task = await findTaskOrThrow(projectId, taskId);
  if (input.assignedToId) {
    await ensureAssigneeIsMember(projectId, input.assignedToId);
  }

  await prisma.task.update({ where: { id: task.id }, data: input });

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        await getTaskDetail(task.id),
        "Task updated successfully",
      ),
    );
};

export const deleteTask = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { projectId, taskId } = req.params as TaskParams;

  const task = await findTaskOrThrow(projectId, taskId);
  // Read the attachment files first: deleting the task cascades to these rows.
  const attachments = await prisma.attachment.findMany({
    where: { taskId: task.id },
    select: { publicId: true, mimeType: true },
  });

  await prisma.task.delete({ where: { id: task.id } });

  await Promise.all(
    attachments.map((attachment) =>
      deleteFile(attachment.publicId, attachment.mimeType),
    ),
  );

  res.status(200).json(new ApiResponse(200, null, "Task deleted successfully"));
};
