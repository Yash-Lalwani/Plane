import type { Request, Response } from "express";
import { prisma } from "../config/db.js";
import { ProjectRole } from "../generated/prisma/client.js";
import { ApiResponse } from "../utils/api-response.js";
import { deleteFile } from "../utils/file-storage.js";
import { publicUserSelect } from "../utils/selects.js";
import type {
  CreateProjectInput,
  ProjectParams,
  UpdateProjectInput,
} from "../validators/project.validator.js";

// Loaded with every project so responses can include the creator and member count.
const projectInclude = {
  createdBy: { select: publicUserSelect },
  _count: { select: { members: true } },
} as const;

type ProjectWithCount = { _count: { members: number } };

// Turns Prisma's _count into a flat memberCount and adds the current user's role.
const toProjectResponse = <T extends ProjectWithCount>(
  project: T,
  role: ProjectRole,
) => {
  const { _count, ...rest } = project;
  return { ...rest, role, memberCount: _count.members };
};

export const listProjects = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const memberships = await prisma.projectMember.findMany({
    where: { userId: req.user.id },
    include: { project: { include: projectInclude } },
    orderBy: { createdAt: "desc" },
  });

  const projects = memberships.map((membership) =>
    toProjectResponse(membership.project, membership.role),
  );

  res
    .status(200)
    .json(new ApiResponse(200, projects, "Projects fetched successfully"));
};

export const createProject = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { name, description } = req.body as CreateProjectInput;

  // A nested create runs in one transaction: the project never exists without its Admin.
  const project = await prisma.project.create({
    data: {
      name,
      description,
      createdById: req.user.id,
      members: { create: { userId: req.user.id, role: ProjectRole.ADMIN } },
    },
    include: projectInclude,
  });

  res
    .status(201)
    .json(
      new ApiResponse(
        201,
        toProjectResponse(project, ProjectRole.ADMIN),
        "Project created successfully",
      ),
    );
};

export const getProject = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { projectId } = req.params as ProjectParams;

  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
    include: projectInclude,
  });

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        toProjectResponse(project, req.projectMember.role),
        "Project fetched successfully",
      ),
    );
};

export const updateProject = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { projectId } = req.params as ProjectParams;
  const { name, description } = req.body as UpdateProjectInput;

  const project = await prisma.project.update({
    where: { id: projectId },
    data: { name, description },
    include: projectInclude,
  });

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        toProjectResponse(project, req.projectMember.role),
        "Project updated successfully",
      ),
    );
};

export const deleteProject = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { projectId } = req.params as ProjectParams;

  // Read the attachment files first: once the project is deleted, the cascade removes these rows.
  const attachments = await prisma.attachment.findMany({
    where: { task: { projectId } },
    select: { publicId: true, mimeType: true },
  });

  await prisma.project.delete({ where: { id: projectId } });

  await Promise.all(
    attachments.map((attachment) =>
      deleteFile(attachment.publicId, attachment.mimeType),
    ),
  );

  res
    .status(200)
    .json(new ApiResponse(200, null, "Project deleted successfully"));
};
