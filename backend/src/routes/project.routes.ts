import { Router } from "express";
import { listActivity } from "../controllers/activity.controller.js";
import { getDashboard } from "../controllers/dashboard.controller.js";
import {
  createProject,
  deleteProject,
  getProject,
  listProjects,
  updateProject,
} from "../controllers/project.controller.js";
import { ProjectRole } from "../generated/prisma/client.js";
import {
  requireVerifiedEmail,
  verifyJWT,
} from "../middlewares/auth.middleware.js";
import { requireProjectRole } from "../middlewares/project-role.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { listActivityQuerySchema } from "../validators/activity.validator.js";
import {
  createProjectSchema,
  projectParamsSchema,
  updateProjectSchema,
} from "../validators/project.validator.js";
import { projectInvitationRouter } from "./invitation.routes.js";
import { memberRouter } from "./member.routes.js";
import { noteRouter } from "./note.routes.js";
import { taskRouter } from "./task.routes.js";

export const projectRouter = Router();

// Every project route, including nested ones, needs a logged-in user with a verified email.
projectRouter.use(verifyJWT, requireVerifiedEmail);

projectRouter.get("/", listProjects);
projectRouter.post("/", validate({ body: createProjectSchema }), createProject);
projectRouter.get(
  "/:projectId",
  validate({ params: projectParamsSchema }),
  requireProjectRole(),
  getProject,
);
projectRouter.patch(
  "/:projectId",
  validate({ params: projectParamsSchema, body: updateProjectSchema }),
  requireProjectRole(ProjectRole.ADMIN),
  updateProject,
);
projectRouter.delete(
  "/:projectId",
  validate({ params: projectParamsSchema }),
  requireProjectRole(ProjectRole.ADMIN),
  deleteProject,
);

projectRouter.get(
  "/:projectId/dashboard",
  validate({ params: projectParamsSchema }),
  requireProjectRole(),
  getDashboard,
);
projectRouter.get(
  "/:projectId/activity",
  validate({ params: projectParamsSchema, query: listActivityQuerySchema }),
  requireProjectRole(),
  listActivity,
);

projectRouter.use("/:projectId/members", memberRouter);
projectRouter.use("/:projectId/invitations", projectInvitationRouter);
projectRouter.use("/:projectId/tasks", taskRouter);
projectRouter.use("/:projectId/notes", noteRouter);
