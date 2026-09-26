import { z } from "zod";
import { ProjectRole } from "../generated/prisma/client.js";
import { emailSchema } from "./auth.validator.js";

export const invitationParamsSchema = z.object({
  projectId: z.uuid(),
  invitationId: z.uuid(),
});

export const createInvitationSchema = z.object({
  email: emailSchema,
  role: z.enum(ProjectRole),
});

export type InvitationParams = z.infer<typeof invitationParamsSchema>;
export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;
