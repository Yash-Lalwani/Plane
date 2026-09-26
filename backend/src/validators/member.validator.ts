import { z } from "zod";
import { ProjectRole } from "../generated/prisma/client.js";

export const memberParamsSchema = z.object({
  projectId: z.uuid(),
  userId: z.uuid(),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(ProjectRole),
});

export type MemberParams = z.infer<typeof memberParamsSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
