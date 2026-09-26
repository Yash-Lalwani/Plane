import { Router } from "express";
import {
  createNote,
  deleteNote,
  getNote,
  listNotes,
  updateNote,
} from "../controllers/note.controller.js";
import { ProjectRole } from "../generated/prisma/client.js";
import { requireProjectRole } from "../middlewares/project-role.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  noteBodySchema,
  noteParamsSchema,
} from "../validators/note.validator.js";
import { projectParamsSchema } from "../validators/project.validator.js";

// Mounted at /projects/:projectId/notes. Members read, only Admins write.
export const noteRouter = Router({ mergeParams: true });

noteRouter.get(
  "/",
  validate({ params: projectParamsSchema }),
  requireProjectRole(),
  listNotes,
);
noteRouter.post(
  "/",
  validate({ params: projectParamsSchema, body: noteBodySchema }),
  requireProjectRole(ProjectRole.ADMIN),
  createNote,
);
noteRouter.get(
  "/:noteId",
  validate({ params: noteParamsSchema }),
  requireProjectRole(),
  getNote,
);
noteRouter.patch(
  "/:noteId",
  validate({ params: noteParamsSchema, body: noteBodySchema }),
  requireProjectRole(ProjectRole.ADMIN),
  updateNote,
);
noteRouter.delete(
  "/:noteId",
  validate({ params: noteParamsSchema }),
  requireProjectRole(ProjectRole.ADMIN),
  deleteNote,
);
