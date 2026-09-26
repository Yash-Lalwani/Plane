import { z } from "zod";
import { TaskPriority, TaskStatus } from "../generated/prisma/client.js";
import { paginationQuerySchema } from "../utils/pagination.js";

export const taskParamsSchema = z.object({
  projectId: z.uuid(),
  taskId: z.uuid(),
});

const titleSchema = z.string().trim().min(1).max(200);
const descriptionSchema = z.string().trim().max(5000);

export const createTaskSchema = z.object({
  title: titleSchema,
  description: descriptionSchema.optional(),
  status: z.enum(TaskStatus).optional(),
  priority: z.enum(TaskPriority).optional(),
  dueDate: z.coerce.date().optional(),
  assignedToId: z.uuid().optional(),
});

// null clears a field: no description, no due date, or unassigned.
export const updateTaskSchema = z
  .object({
    title: titleSchema.optional(),
    description: descriptionSchema.nullable().optional(),
    status: z.enum(TaskStatus).optional(),
    priority: z.enum(TaskPriority).optional(),
    dueDate: z.coerce.date().nullable().optional(),
    assignedToId: z.uuid().nullable().optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "Provide at least one field to update",
  });

export const listTasksQuerySchema = paginationQuerySchema.extend({
  status: z.enum(TaskStatus).optional(),
  priority: z.enum(TaskPriority).optional(),
  assignedTo: z.union([z.literal("me"), z.uuid()]).optional(),
  overdue: z.enum(["true", "false"]).optional(),
  search: z.string().trim().min(1).max(200).optional(),
  sortBy: z.enum(["createdAt", "dueDate", "priority"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export type TaskParams = z.infer<typeof taskParamsSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
