import type { Request, Response } from "express";
import { prisma } from "../config/db.js";
import { ProjectRole } from "../generated/prisma/client.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { findTaskOrThrow } from "../utils/find-task.js";
import { buildPaginatedData, getSkipTake } from "../utils/pagination.js";
import { publicUserSelect } from "../utils/selects.js";
import type {
  CommentBody,
  CommentParams,
  ListCommentsQuery,
} from "../validators/comment.validator.js";
import type { TaskParams } from "../validators/task.validator.js";

const commentInclude = { author: { select: publicUserSelect } } as const;

const findCommentOrThrow = async ({
  projectId,
  taskId,
  commentId,
}: CommentParams) => {
  const comment = await prisma.comment.findFirst({
    where: { id: commentId, taskId, task: { projectId } },
  });
  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }
  return comment;
};

export const listComments = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { projectId, taskId } = req.params as TaskParams;
  const query = req.validatedQuery as ListCommentsQuery;

  const task = await findTaskOrThrow(projectId, taskId);
  const where = { taskId: task.id };
  const [comments, total] = await Promise.all([
    prisma.comment.findMany({
      where,
      include: commentInclude,
      // Oldest first, like a conversation. id breaks ties so pages never overlap.
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      ...getSkipTake(query),
    }),
    prisma.comment.count({ where }),
  ]);

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        buildPaginatedData(comments, total, query),
        "Comments fetched successfully",
      ),
    );
};

export const createComment = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { projectId, taskId } = req.params as TaskParams;
  const { content } = req.body as CommentBody;

  const task = await findTaskOrThrow(projectId, taskId);
  const comment = await prisma.comment.create({
    data: { taskId: task.id, authorId: req.user.id, content },
    include: commentInclude,
  });

  res
    .status(201)
    .json(new ApiResponse(201, comment, "Comment added successfully"));
};

export const updateComment = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { content } = req.body as CommentBody;

  const comment = await findCommentOrThrow(req.params as CommentParams);
  if (comment.authorId !== req.user.id) {
    throw new ApiError(403, "You can only edit your own comments");
  }

  const updated = await prisma.comment.update({
    where: { id: comment.id },
    data: { content },
    include: commentInclude,
  });

  res
    .status(200)
    .json(new ApiResponse(200, updated, "Comment updated successfully"));
};

export const deleteComment = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const comment = await findCommentOrThrow(req.params as CommentParams);

  const isAuthor = comment.authorId === req.user.id;
  const isAdmin = req.projectMember.role === ProjectRole.ADMIN;
  if (!isAuthor && !isAdmin) {
    throw new ApiError(403, "You can only delete your own comments");
  }

  await prisma.comment.delete({ where: { id: comment.id } });

  res
    .status(200)
    .json(new ApiResponse(200, null, "Comment deleted successfully"));
};
