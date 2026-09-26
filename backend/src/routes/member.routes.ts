import { Router } from "express";
import {
  listMembers,
  removeMember,
  updateMemberRole,
} from "../controllers/member.controller.js";
import { ProjectRole } from "../generated/prisma/client.js";
import { requireProjectRole } from "../middlewares/project-role.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  memberParamsSchema,
  updateMemberRoleSchema,
} from "../validators/member.validator.js";
import { projectParamsSchema } from "../validators/project.validator.js";

// mergeParams gives these routes access to :projectId from the parent router.
export const memberRouter = Router({ mergeParams: true });

memberRouter.get(
  "/",
  validate({ params: projectParamsSchema }),
  requireProjectRole(),
  listMembers,
);
memberRouter.patch(
  "/:userId",
  validate({ params: memberParamsSchema, body: updateMemberRoleSchema }),
  requireProjectRole(ProjectRole.ADMIN),
  updateMemberRole,
);
memberRouter.delete(
  "/:userId",
  validate({ params: memberParamsSchema }),
  requireProjectRole(ProjectRole.ADMIN),
  removeMember,
);
