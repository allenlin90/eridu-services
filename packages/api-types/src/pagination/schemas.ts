import { z } from 'zod';

/**
 * Pagination Metadata Schema
 * Reusable schema for paginated API responses
 */
export const paginationMetaSchema = z.object({
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0),
});

/**
 * Paginated Response Schema Factory
 * Creates a paginated response schema for any data type
 *
 * @example
 * ```ts
 * const paginatedShowsSchema = createPaginatedResponseSchema(showApiResponseSchema);
 * ```
 */
export function createPaginatedResponseSchema<T extends z.ZodTypeAny>(
  dataSchema: T,
) {
  return z.object({
    data: z.array(dataSchema),
    meta: paginationMetaSchema,
  });
}
