import { Router } from "express";
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
import {
  createProjectSchema,
  projectParamsSchema,
  updateProjectSchema,
} from "../validators/project.validator.js";
import { memberRouter } from "./member.routes.js";

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

projectRouter.use("/:projectId/members", memberRouter);
