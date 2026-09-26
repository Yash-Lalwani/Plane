import type { Request, Response } from "express";
import { prisma } from "../config/db.js";
import { env } from "../config/env.js";
import { InvitationStatus } from "../generated/prisma/client.js";
import { addEmailJob } from "../queues/email.queue.js";
import { logActivity } from "../utils/activity.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { invalidateDashboardCache } from "../utils/cache.js";
import { invitationEmail } from "../utils/email-templates.js";
import { publicUserSelect } from "../utils/selects.js";
import { createRandomToken, hashToken } from "../utils/tokens.js";
import type { TokenParams } from "../validators/auth.validator.js";
import type {
  CreateInvitationInput,
  InvitationParams,
} from "../validators/invitation.validator.js";
import type { ProjectParams } from "../validators/project.validator.js";

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// Everything about an invitation except its token hash.
const invitationSelect = {
  id: true,
  projectId: true,
  email: true,
  role: true,
  status: true,
  expiresAt: true,
  acceptedAt: true,
  createdAt: true,
  invitedBy: { select: publicUserSelect },
} as const;

const findInvitationByToken = (token: string) =>
  prisma.projectInvitation.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      project: { select: { id: true, name: true } },
      invitedBy: { select: publicUserSelect },
    },
  });

export const createInvitation = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { projectId } = req.params as ProjectParams;
  const { email, role } = req.body as CreateInvitationInput;

  const existingMember = await prisma.projectMember.findFirst({
    where: { projectId, user: { email } },
  });
  if (existingMember) {
    throw new ApiError(409, "This user is already a member of the project");
  }

  // An expired pending invitation does not block a new one.
  const pendingInvitation = await prisma.projectInvitation.findFirst({
    where: {
      projectId,
      email,
      status: InvitationStatus.PENDING,
      expiresAt: { gt: new Date() },
    },
  });
  if (pendingInvitation) {
    throw new ApiError(
      409,
      "A pending invitation already exists for this email",
    );
  }

  const { token, tokenHash } = createRandomToken();
  const invitation = await prisma.projectInvitation.create({
    data: {
      projectId,
      email,
      role,
      tokenHash,
      invitedById: req.user.id,
      expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
    },
    select: { ...invitationSelect, project: { select: { name: true } } },
  });

  const { project, ...invitationData } = invitation;
  const link = `${env.CLIENT_URL}/invitations/${token}`;
  await addEmailJob({
    to: email,
    ...invitationEmail(req.user.username, project.name, role, link),
  });
  await logActivity({
    projectId,
    actorId: req.user.id,
    action: "invitation.sent",
    entityType: "invitation",
    entityId: invitation.id,
    metadata: { email, role },
  });

  res
    .status(201)
    .json(new ApiResponse(201, invitationData, "Invitation sent successfully"));
};

export const listInvitations = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { projectId } = req.params as ProjectParams;

  // Includes expired pending invitations; expiresAt tells the client which ones they are.
  const invitations = await prisma.projectInvitation.findMany({
    where: { projectId, status: InvitationStatus.PENDING },
    select: invitationSelect,
    orderBy: { createdAt: "desc" },
  });

  res
    .status(200)
    .json(
      new ApiResponse(200, invitations, "Invitations fetched successfully"),
    );
};

export const revokeInvitation = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { projectId, invitationId } = req.params as InvitationParams;

  const invitation = await prisma.projectInvitation.findFirst({
    where: { id: invitationId, projectId },
  });
  if (!invitation) {
    throw new ApiError(404, "Invitation not found");
  }
  if (invitation.status !== InvitationStatus.PENDING) {
    throw new ApiError(400, "Only pending invitations can be revoked");
  }

  const revoked = await prisma.projectInvitation.update({
    where: { id: invitation.id },
    data: { status: InvitationStatus.REVOKED },
    select: invitationSelect,
  });
  await logActivity({
    projectId,
    actorId: req.user.id,
    action: "invitation.revoked",
    entityType: "invitation",
    entityId: invitation.id,
    metadata: { email: invitation.email },
  });

  res
    .status(200)
    .json(new ApiResponse(200, revoked, "Invitation revoked successfully"));
};

export const previewInvitation = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { token } = req.params as TokenParams;

  const invitation = await findInvitationByToken(token);
  if (!invitation) {
    throw new ApiError(404, "Invitation not found");
  }

  const preview = {
    project: invitation.project,
    invitedBy: invitation.invitedBy,
    email: invitation.email,
    role: invitation.role,
    status: invitation.status,
    expiresAt: invitation.expiresAt,
  };

  res
    .status(200)
    .json(new ApiResponse(200, preview, "Invitation fetched successfully"));
};

export const acceptInvitation = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { token } = req.params as TokenParams;

  const invitation = await findInvitationByToken(token);
  if (!invitation) {
    throw new ApiError(404, "Invitation not found");
  }
  if (invitation.status !== InvitationStatus.PENDING) {
    throw new ApiError(400, "This invitation is no longer valid");
  }
  if (invitation.expiresAt <= new Date()) {
    throw new ApiError(400, "This invitation has expired");
  }
  if (invitation.email !== req.user.email) {
    throw new ApiError(
      403,
      "This invitation was sent to a different email address",
    );
  }

  const existingMember = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId: invitation.projectId,
        userId: req.user.id,
      },
    },
  });
  if (existingMember) {
    throw new ApiError(409, "You are already a member of this project");
  }

  // Both writes succeed or neither does: an invitation is never marked accepted without
  // the membership, and a membership is never created from a still-pending invitation.
  const [member] = await prisma.$transaction([
    prisma.projectMember.create({
      data: {
        projectId: invitation.projectId,
        userId: req.user.id,
        role: invitation.role,
      },
      select: { projectId: true, role: true, createdAt: true },
    }),
    prisma.projectInvitation.update({
      where: { id: invitation.id },
      data: { status: InvitationStatus.ACCEPTED, acceptedAt: new Date() },
    }),
  ]);
  await logActivity({
    projectId: invitation.projectId,
    actorId: req.user.id,
    action: "member.joined",
    entityType: "member",
    entityId: req.user.id,
    metadata: { username: req.user.username, role: invitation.role },
  });
  await invalidateDashboardCache(invitation.projectId);

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { ...member, project: invitation.project },
        "Invitation accepted",
      ),
    );
};
