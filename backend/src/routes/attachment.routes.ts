import { Router } from "express";
import {
  addAttachments,
  deleteAttachment,
} from "../controllers/attachment.controller.js";
import { ProjectRole } from "../generated/prisma/client.js";
import { requireProjectRole } from "../middlewares/project-role.middleware.js";
import { uploadAttachments } from "../middlewares/upload.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { attachmentParamsSchema } from "../validators/attachment.validator.js";
import { taskParamsSchema } from "../validators/task.validator.js";

// Mounted at /projects/:projectId/tasks/:taskId/attachments.
export const attachmentRouter = Router({ mergeParams: true });

// The role check runs before Multer, so files from users who may not upload are never read.
attachmentRouter.post(
  "/",
  validate({ params: taskParamsSchema }),
  requireProjectRole(ProjectRole.ADMIN, ProjectRole.PROJECT_ADMIN),
  uploadAttachments,
  addAttachments,
);
attachmentRouter.delete(
  "/:attachmentId",
  validate({ params: attachmentParamsSchema }),
  requireProjectRole(ProjectRole.ADMIN, ProjectRole.PROJECT_ADMIN),
  deleteAttachment,
);
