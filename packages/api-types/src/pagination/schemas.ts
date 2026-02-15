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

// Input schema for pagination parameters (matches erify_api behavior)
export const paginationQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).optional().default(10),
    sort: z.enum(['asc', 'desc']).optional().default('desc'),
  })
  .transform((data) => ({
    page: data.page,
    limit: data.limit,
    take: data.limit,
    skip: (data.page - 1) * data.limit,
    sort: data.sort,
  }));

/**
 * Pagination query input type (before transformation)
 * Use this for API request parameters
 */
export type PaginationQueryInput = z.input<typeof paginationQuerySchema>;

/**
 * Pagination query output type (after transformation)
 * Use this for validated and transformed query parameters
 */
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

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
