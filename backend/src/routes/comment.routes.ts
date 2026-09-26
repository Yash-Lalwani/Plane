import { Router } from "express";
import {
  createComment,
  deleteComment,
  listComments,
  updateComment,
} from "../controllers/comment.controller.js";
import { requireProjectRole } from "../middlewares/project-role.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  commentBodySchema,
  commentParamsSchema,
  listCommentsQuerySchema,
} from "../validators/comment.validator.js";
import { taskParamsSchema } from "../validators/task.validator.js";

// Mounted at /projects/:projectId/tasks/:taskId/comments. Every route is open to any member;
// the controller decides who may edit or delete a specific comment.
export const commentRouter = Router({ mergeParams: true });

commentRouter.get(
  "/",
  validate({ params: taskParamsSchema, query: listCommentsQuerySchema }),
  requireProjectRole(),
  listComments,
);
commentRouter.post(
  "/",
  validate({ params: taskParamsSchema, body: commentBodySchema }),
  requireProjectRole(),
  createComment,
);
commentRouter.patch(
  "/:commentId",
  validate({ params: commentParamsSchema, body: commentBodySchema }),
  requireProjectRole(),
  updateComment,
);
commentRouter.delete(
  "/:commentId",
  validate({ params: commentParamsSchema }),
  requireProjectRole(),
  deleteComment,
);
