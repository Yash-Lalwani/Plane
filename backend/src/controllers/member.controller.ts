import type { Request, Response } from "express";
import { prisma } from "../config/db.js";
import { ProjectRole } from "../generated/prisma/client.js";
import { logActivity } from "../utils/activity.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { invalidateDashboardCache } from "../utils/cache.js";
import { publicUserSelect } from "../utils/selects.js";
import type {
  MemberParams,
  UpdateMemberRoleInput,
} from "../validators/member.validator.js";
import type { ProjectParams } from "../validators/project.validator.js";

const findMemberOrThrow = async ({ projectId, userId }: MemberParams) => {
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
    include: { user: { select: { username: true } } },
  });
  if (!member) {
    throw new ApiError(404, "Member not found");
  }
  return member;
};

// Throws when the member is an Admin and no other Admin would be left.
const ensureNotLastAdmin = async (
  projectId: string,
  role: ProjectRole,
): Promise<void> => {
  if (role !== ProjectRole.ADMIN) {
    return;
  }
  const adminCount = await prisma.projectMember.count({
    where: { projectId, role: ProjectRole.ADMIN },
  });
  if (adminCount <= 1) {
    throw new ApiError(400, "A project must have at least one Admin");
  }
};

export const listMembers = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { projectId } = req.params as ProjectParams;

  const members = await prisma.projectMember.findMany({
    where: { projectId },
    select: { role: true, createdAt: true, user: { select: publicUserSelect } },
    orderBy: { createdAt: "asc" },
  });

  res
    .status(200)
    .json(new ApiResponse(200, members, "Members fetched successfully"));
};

export const updateMemberRole = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const params = req.params as MemberParams;
  const { role } = req.body as UpdateMemberRoleInput;

  const member = await findMemberOrThrow(params);
  if (role !== ProjectRole.ADMIN) {
    await ensureNotLastAdmin(params.projectId, member.role);
  }

  const updated = await prisma.projectMember.update({
    where: { id: member.id },
    data: { role },
    select: { role: true, createdAt: true, user: { select: publicUserSelect } },
  });
  await logActivity({
    projectId: params.projectId,
    actorId: req.user.id,
    action: "member.role_changed",
    entityType: "member",
    entityId: params.userId,
    metadata: { username: member.user.username, from: member.role, to: role },
  });
  await invalidateDashboardCache(params.projectId);

  res
    .status(200)
    .json(new ApiResponse(200, updated, "Member role updated successfully"));
};

export const removeMember = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const params = req.params as MemberParams;

  const member = await findMemberOrThrow(params);
  await ensureNotLastAdmin(params.projectId, member.role);

  // Both writes succeed or neither does: no tasks stay assigned to someone who left.
  await prisma.$transaction([
    prisma.task.updateMany({
      where: { projectId: params.projectId, assignedToId: params.userId },
      data: { assignedToId: null },
    }),
    prisma.projectMember.delete({ where: { id: member.id } }),
  ]);
  await logActivity({
    projectId: params.projectId,
    actorId: req.user.id,
    action: "member.removed",
    entityType: "member",
    entityId: params.userId,
    metadata: { username: member.user.username },
  });
  await invalidateDashboardCache(params.projectId);

  res
    .status(200)
    .json(new ApiResponse(200, null, "Member removed successfully"));
};
