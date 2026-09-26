import type { RequestHandler } from "express";
import { prisma } from "../config/db.js";
import type { ProjectRole } from "../generated/prisma/client.js";
import { ApiError } from "../utils/api-error.js";
import type { ProjectParams } from "../validators/project.validator.js";

// Call with no roles to allow any member. Non-members get 404 so the API never reveals
// whether a project they can't see exists.
export const requireProjectRole =
  (...roles: ProjectRole[]): RequestHandler =>
  async (req, _res, next) => {
    // The validate middleware has already checked projectId is a UUID.
    const { projectId } = req.params as ProjectParams;
    const membership = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId, userId: req.user.id },
      },
    });
    if (!membership) {
      throw new ApiError(404, "Project not found");
    }
    if (roles.length > 0 && !roles.includes(membership.role)) {
      throw new ApiError(
        403,
        "You do not have permission to perform this action",
      );
    }

    req.projectMember = membership;
    next();
  };
