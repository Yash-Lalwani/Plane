import type { Prisma } from "../generated/prisma/client.js";

// The only user fields that may leave the API. Never includes the password or token hashes.
export const publicUserSelect = {
  id: true,
  email: true,
  username: true,
  fullName: true,
  avatarUrl: true,
  isEmailVerified: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;
