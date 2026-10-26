import { z } from "zod";

export const commentParamsSchema = z.object({
  projectId: z.uuid(),
  taskId: z.uuid(),
  commentId: z.uuid(),
});

export const commentBodySchema = z.object({
  content: z.string().trim().min(1).max(5000),
});

export type CommentParams = z.infer<typeof commentParamsSchema>;
export type CommentBody = z.infer<typeof commentBodySchema>;
