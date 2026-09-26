import type { ProjectMember } from "../generated/prisma/client.js";
import type { PublicUser } from "../utils/selects.js";

declare global {
  namespace Express {
    interface Request {
      // Set by verifyJWT. Only read it in routes that run verifyJWT first.
      user: PublicUser;
      // Set by requireProjectRole: the current user's membership in req.params.projectId.
      projectMember: ProjectMember;
      // Parsed query string from the validate middleware (Express 5 makes req.query read-only).
      validatedQuery: unknown;
    }
  }
}

export {};
