import { Router } from "express";
import {
  createSubtask,
  deleteSubtask,
  updateSubtask,
} from "../controllers/subtask.controller.js";
import { ProjectRole } from "../generated/prisma/client.js";
import { requireProjectRole } from "../middlewares/project-role.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  createSubtaskSchema,
  subtaskParamsSchema,
  updateSubtaskSchema,
} from "../validators/subtask.validator.js";
import { taskParamsSchema } from "../validators/task.validator.js";

// Mounted at /projects/:projectId/tasks/:taskId/subtasks.
export const subtaskRouter = Router({ mergeParams: true });

subtaskRouter.post(
  "/",
  validate({ params: taskParamsSchema, body: createSubtaskSchema }),
  requireProjectRole(ProjectRole.ADMIN, ProjectRole.PROJECT_ADMIN),
  createSubtask,
);
// Any member may update; the controller stops Members from changing the title.
subtaskRouter.patch(
  "/:subtaskId",
  validate({ params: subtaskParamsSchema, body: updateSubtaskSchema }),
  requireProjectRole(),
  updateSubtask,
);
subtaskRouter.delete(
  "/:subtaskId",
  validate({ params: subtaskParamsSchema }),
  requireProjectRole(ProjectRole.ADMIN, ProjectRole.PROJECT_ADMIN),
  deleteSubtask,
);
