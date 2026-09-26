import { z } from "zod";

// Query string values arrive as strings, so they are coerced to numbers.
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export const getSkipTake = ({ page, limit }: PaginationQuery) => ({
  skip: (page - 1) * limit,
  take: limit,
});

export const buildPaginatedData = <T>(
  items: T[],
  total: number,
  { page, limit }: PaginationQuery,
) => ({
  items,
  pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
});
