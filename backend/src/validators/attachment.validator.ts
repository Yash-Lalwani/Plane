import { z } from "zod";

export const attachmentParamsSchema = z.object({
  projectId: z.uuid(),
  taskId: z.uuid(),
  attachmentId: z.uuid(),
});

export type AttachmentParams = z.infer<typeof attachmentParamsSchema>;
