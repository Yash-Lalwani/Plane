import type { Request, Response } from "express";
import { prisma } from "../config/db.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { deleteFile, uploadFile } from "../utils/file-storage.js";
import { publicUserSelect } from "../utils/selects.js";
import type { UpdateProfileInput } from "../validators/user.validator.js";

export const updateProfile = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { fullName, username } = req.body as UpdateProfileInput;

  if (username && username !== req.user.username) {
    const taken = await prisma.user.findUnique({ where: { username } });
    if (taken) {
      throw new ApiError(409, "Username is already taken");
    }
  }

  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { fullName, username },
    select: publicUserSelect,
  });

  res
    .status(200)
    .json(new ApiResponse(200, user, "Profile updated successfully"));
};

export const updateAvatar = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.file) {
    throw new ApiError(400, "Avatar file is required");
  }

  const { avatarPublicId: oldPublicId } = await prisma.user.findUniqueOrThrow({
    where: { id: req.user.id },
    select: { avatarPublicId: true },
  });

  const { url, publicId } = await uploadFile(req.file.buffer, "plane/avatars");
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { avatarUrl: url, avatarPublicId: publicId },
    select: publicUserSelect,
  });

  // Delete the old file only after the new one is saved, so a failure never leaves the user without an avatar.
  if (oldPublicId) {
    await deleteFile(oldPublicId);
  }

  res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar updated successfully"));
};
