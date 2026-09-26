import {
  type PaginationQuery,
  paginationQuerySchema,
} from "../utils/pagination.js";

export const listActivityQuerySchema = paginationQuerySchema;

export type ListActivityQuery = PaginationQuery;
