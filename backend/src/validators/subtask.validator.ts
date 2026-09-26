import { z } from "zod";

export const subtaskParamsSchema = z.object({
  projectId: z.uuid(),
  taskId: z.uuid(),
  subtaskId: z.uuid(),
});

const titleSchema = z.string().trim().min(1).max(200);

export const createSubtaskSchema = z.object({
  title: titleSchema,
});

export const updateSubtaskSchema = z
  .object({
    title: titleSchema.optional(),
    isCompleted: z.boolean().optional(),
  })
  .refine(
    (data) => data.title !== undefined || data.isCompleted !== undefined,
    {
      message: "Provide title or isCompleted",
    },
  );

export type SubtaskParams = z.infer<typeof subtaskParamsSchema>;
export type CreateSubtaskInput = z.infer<typeof createSubtaskSchema>;
export type UpdateSubtaskInput = z.infer<typeof updateSubtaskSchema>;
