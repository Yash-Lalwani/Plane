import type { Request, Response } from "express";
import { prisma } from "../config/db.js";
import { logActivity } from "../utils/activity.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { publicUserSelect } from "../utils/selects.js";
import type { NoteBody, NoteParams } from "../validators/note.validator.js";
import type { ProjectParams } from "../validators/project.validator.js";

const noteInclude = { createdBy: { select: publicUserSelect } } as const;

const findNoteOrThrow = async ({ projectId, noteId }: NoteParams) => {
  const note = await prisma.note.findFirst({
    where: { id: noteId, projectId },
  });
  if (!note) {
    throw new ApiError(404, "Note not found");
  }
  return note;
};

export const listNotes = async (req: Request, res: Response): Promise<void> => {
  const { projectId } = req.params as ProjectParams;

  const notes = await prisma.note.findMany({
    where: { projectId },
    include: noteInclude,
    orderBy: { createdAt: "desc" },
  });

  res
    .status(200)
    .json(new ApiResponse(200, notes, "Notes fetched successfully"));
};

export const createNote = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { projectId } = req.params as ProjectParams;
  const { content } = req.body as NoteBody;

  const note = await prisma.note.create({
    data: { projectId, content, createdById: req.user.id },
    include: noteInclude,
  });
  await logActivity({
    projectId,
    actorId: req.user.id,
    action: "note.created",
    entityType: "note",
    entityId: note.id,
  });

  res.status(201).json(new ApiResponse(201, note, "Note created successfully"));
};

export const getNote = async (req: Request, res: Response): Promise<void> => {
  const { projectId, noteId } = req.params as NoteParams;

  const note = await prisma.note.findFirst({
    where: { id: noteId, projectId },
    include: noteInclude,
  });
  if (!note) {
    throw new ApiError(404, "Note not found");
  }

  res.status(200).json(new ApiResponse(200, note, "Note fetched successfully"));
};

export const updateNote = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { content } = req.body as NoteBody;

  const note = await findNoteOrThrow(req.params as NoteParams);
  const updated = await prisma.note.update({
    where: { id: note.id },
    data: { content },
    include: noteInclude,
  });
  await logActivity({
    projectId: note.projectId,
    actorId: req.user.id,
    action: "note.updated",
    entityType: "note",
    entityId: note.id,
  });

  res
    .status(200)
    .json(new ApiResponse(200, updated, "Note updated successfully"));
};

export const deleteNote = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const note = await findNoteOrThrow(req.params as NoteParams);

  await prisma.note.delete({ where: { id: note.id } });
  await logActivity({
    projectId: note.projectId,
    actorId: req.user.id,
    action: "note.deleted",
    entityType: "note",
    entityId: note.id,
  });

  res.status(200).json(new ApiResponse(200, null, "Note deleted successfully"));
};
