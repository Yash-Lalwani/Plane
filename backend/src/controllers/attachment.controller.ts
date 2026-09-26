import type { Request, Response } from "express";
import { prisma } from "../config/db.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { deleteFile, uploadFile } from "../utils/file-storage.js";
import { findTaskOrThrow } from "../utils/find-task.js";
import { publicUserSelect } from "../utils/selects.js";
import type { AttachmentParams } from "../validators/attachment.validator.js";
import type { TaskParams } from "../validators/task.validator.js";

export const addAttachments = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { projectId, taskId } = req.params as TaskParams;

  // Check the task before uploading anything to Cloudinary.
  const task = await findTaskOrThrow(projectId, taskId);
  const files = req.files as Express.Multer.File[] | undefined;
  if (!files || files.length === 0) {
    throw new ApiError(400, "At least one file is required");
  }

  const storedFiles = await Promise.all(
    files.map((file) => uploadFile(file.buffer, "plane/attachments")),
  );

  const attachments = await prisma.attachment.createManyAndReturn({
    data: files.map((file, index) => ({
      taskId: task.id,
      url: storedFiles[index].url,
      publicId: storedFiles[index].publicId,
      fileName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      uploadedById: req.user.id,
    })),
    include: { uploadedBy: { select: publicUserSelect } },
  });

  res
    .status(201)
    .json(
      new ApiResponse(201, attachments, "Attachments uploaded successfully"),
    );
};

export const deleteAttachment = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { projectId, taskId, attachmentId } = req.params as AttachmentParams;

  const attachment = await prisma.attachment.findFirst({
    where: { id: attachmentId, taskId, task: { projectId } },
  });
  if (!attachment) {
    throw new ApiError(404, "Attachment not found");
  }

  await prisma.attachment.delete({ where: { id: attachment.id } });
  await deleteFile(attachment.publicId, attachment.mimeType);

  res
    .status(200)
    .json(new ApiResponse(200, null, "Attachment deleted successfully"));
};
