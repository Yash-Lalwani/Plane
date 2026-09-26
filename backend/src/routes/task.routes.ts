import { Router } from "express";
import {
  createTask,
  deleteTask,
  getTask,
  listTasks,
  updateTask,
} from "../controllers/task.controller.js";
import { ProjectRole } from "../generated/prisma/client.js";
import { requireProjectRole } from "../middlewares/project-role.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { projectParamsSchema } from "../validators/project.validator.js";
import {
  createTaskSchema,
  listTasksQuerySchema,
  taskParamsSchema,
  updateTaskSchema,
} from "../validators/task.validator.js";
import { attachmentRouter } from "./attachment.routes.js";
import { subtaskRouter } from "./subtask.routes.js";

// Mounted at /projects/:projectId/tasks.
export const taskRouter = Router({ mergeParams: true });

taskRouter.get(
  "/",
  validate({ params: projectParamsSchema, query: listTasksQuerySchema }),
  requireProjectRole(),
  listTasks,
);
taskRouter.post(
  "/",
  validate({ params: projectParamsSchema, body: createTaskSchema }),
  requireProjectRole(ProjectRole.ADMIN, ProjectRole.PROJECT_ADMIN),
  createTask,
);
taskRouter.get(
  "/:taskId",
  validate({ params: taskParamsSchema }),
  requireProjectRole(),
  getTask,
);
taskRouter.patch(
  "/:taskId",
  validate({ params: taskParamsSchema, body: updateTaskSchema }),
  requireProjectRole(ProjectRole.ADMIN, ProjectRole.PROJECT_ADMIN),
  updateTask,
);
taskRouter.delete(
  "/:taskId",
  validate({ params: taskParamsSchema }),
  requireProjectRole(ProjectRole.ADMIN, ProjectRole.PROJECT_ADMIN),
  deleteTask,
);

taskRouter.use("/:taskId/attachments", attachmentRouter);
taskRouter.use("/:taskId/subtasks", subtaskRouter);
