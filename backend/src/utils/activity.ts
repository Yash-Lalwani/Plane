import { prisma } from "../config/db.js";
import { logger } from "../config/logger.js";
import type { Prisma } from "../generated/prisma/client.js";

// The actions recorded in the activity feed (PRD 3.11).
export type ActivityAction =
  | "project.created"
  | "project.updated"
  | "member.joined"
  | "member.role_changed"
  | "member.removed"
  | "invitation.sent"
  | "invitation.revoked"
  | "task.created"
  | "task.updated"
  | "task.status_changed"
  | "task.deleted"
  | "note.created"
  | "note.updated"
  | "note.deleted";

type ActivityInput = {
  projectId: string;
  actorId: string;
  action: ActivityAction;
  entityType: "project" | "member" | "invitation" | "task" | "note";
  entityId: string;
  metadata?: Prisma.InputJsonObject;
};

// Called after the main write has succeeded. A failure here is logged, not thrown, so the
// client is never told their change failed when it actually went through.
export const logActivity = async (input: ActivityInput): Promise<void> => {
  try {
    await prisma.activityLog.create({ data: input });
  } catch (error) {
    logger.warn(
      { err: error, action: input.action },
      "Failed to record activity",
    );
  }
};
