import { z } from "zod";
import { paginationQuerySchema } from "../utils/pagination.js";

export const commentParamsSchema = z.object({
  projectId: z.uuid(),
  taskId: z.uuid(),
  commentId: z.uuid(),
});

export const commentBodySchema = z.object({
  content: z.string().trim().min(1).max(5000),
});

export const listCommentsQuerySchema = paginationQuerySchema;

export type CommentParams = z.infer<typeof commentParamsSchema>;
export type CommentBody = z.infer<typeof commentBodySchema>;
export type ListCommentsQuery = z.infer<typeof listCommentsQuerySchema>;
