import { z } from "zod";

export const projectParamsSchema = z.object({
  projectId: z.uuid(),
});

const nameSchema = z.string().trim().min(1).max(100);
const descriptionSchema = z.string().trim().max(1000);

export const createProjectSchema = z.object({
  name: nameSchema,
  description: descriptionSchema.optional(),
});

export const updateProjectSchema = z
  .object({
    name: nameSchema.optional(),
    description: descriptionSchema.nullable().optional(),
  })
  .refine((data) => data.name !== undefined || data.description !== undefined, {
    message: "Provide name or description",
  });

export type ProjectParams = z.infer<typeof projectParamsSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
