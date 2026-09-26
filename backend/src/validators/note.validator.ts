import { z } from "zod";

export const noteParamsSchema = z.object({
  projectId: z.uuid(),
  noteId: z.uuid(),
});

export const noteBodySchema = z.object({
  content: z.string().trim().min(1).max(5000),
});

export type NoteParams = z.infer<typeof noteParamsSchema>;
export type NoteBody = z.infer<typeof noteBodySchema>;
