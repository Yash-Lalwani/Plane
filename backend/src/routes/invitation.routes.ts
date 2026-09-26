import { Router } from "express";
import {
  acceptInvitation,
  createInvitation,
  listInvitations,
  previewInvitation,
  revokeInvitation,
} from "../controllers/invitation.controller.js";
import { ProjectRole } from "../generated/prisma/client.js";
import {
  requireVerifiedEmail,
  verifyJWT,
} from "../middlewares/auth.middleware.js";
import { requireProjectRole } from "../middlewares/project-role.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { tokenParamSchema } from "../validators/auth.validator.js";
import {
  createInvitationSchema,
  invitationParamsSchema,
} from "../validators/invitation.validator.js";
import { projectParamsSchema } from "../validators/project.validator.js";

// Mounted at /projects/:projectId/invitations. Managing invitations is Admin-only.
export const projectInvitationRouter = Router({ mergeParams: true });

projectInvitationRouter.post(
  "/",
  validate({ params: projectParamsSchema, body: createInvitationSchema }),
  requireProjectRole(ProjectRole.ADMIN),
  createInvitation,
);
projectInvitationRouter.get(
  "/",
  validate({ params: projectParamsSchema }),
  requireProjectRole(ProjectRole.ADMIN),
  listInvitations,
);
projectInvitationRouter.delete(
  "/:invitationId",
  validate({ params: invitationParamsSchema }),
  requireProjectRole(ProjectRole.ADMIN),
  revokeInvitation,
);

// Mounted at /invitations. Used by the invitee, who is not a member yet.
export const invitationRouter = Router();

invitationRouter.get(
  "/:token",
  validate({ params: tokenParamSchema }),
  previewInvitation,
);
invitationRouter.post(
  "/:token/accept",
  verifyJWT,
  requireVerifiedEmail,
  validate({ params: tokenParamSchema }),
  acceptInvitation,
);
