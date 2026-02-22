import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/**
 * Base pagination parameters (page, limit)
 */
export const paginationBaseSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).optional().default(10),
});

/**
 * Base pagination transformation logic
 */
export function transformPagination<T extends { page: number; limit: number; sort?: any }>(data: T) {
  return {
    ...data,
    page: data.page,
    limit: data.limit,
    take: data.limit,
    skip: (data.page - 1) * data.limit,
    sort: data.sort,
  };
}

// Input schema for pagination parameters
export const paginationQuerySchema = paginationBaseSchema
  .extend({
    sort: z.enum(['asc', 'desc']).optional().default('desc'),
  })
  .transform(transformPagination);

// Pagination metadata schema
export const paginationMetaSchema = z.object({
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0),
  hasNextPage: z.boolean(),
  hasPreviousPage: z.boolean(),
});

// Helper function to create paginated response schema for any data type
export function createPaginatedResponseSchema<T extends z.ZodType>(itemSchema: T) {
  return z.object({
    data: z.array(itemSchema),
    meta: paginationMetaSchema,
  });
}

// DTOs and types
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

/**
 * Interface that all paginated query DTOs must satisfy.
 * We use an interface instead of a hardcoded DTO for flexibility in 'sort' parameters.
 */
export type IPaginationQuery = {
  page: number;
  limit: number;
  take: number;
  skip: number;
  sort?: any;
};

export class PaginationQueryDto
  extends createZodDto(paginationQuerySchema)
  implements IPaginationQuery {
  declare page: number;
  declare limit: number;
  declare take: number;
  declare skip: number;
  declare sort: any;
}

export type PaginationMeta = z.infer<typeof paginationMetaSchema>;
export type PaginatedResponse<T> = {
  data: T[];
  meta: PaginationMeta;
};

// Helper class for pagination parameters
export class PaginationParams {
  page: number;
  limit: number;
  skip: number;

  constructor(page: number = 1, limit: number = 10) {
    this.page = page;
    this.limit = limit;
    this.skip = (page - 1) * limit;
  }
}

// Helper function to create pagination metadata
export function createPaginationMeta(
  page: number,
  limit: number,
  total: number,
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

// Helper function to create paginated query schema with filters
// Combines pagination schema with any filter schema
// This pattern ensures consistent pagination behavior across all list endpoints.
export function createPaginatedQuerySchema<T extends z.ZodType>(
  filterSchema: T,
) {
  return paginationQuerySchema.and(filterSchema);
}

// Helper function to create paginated query DTO class
export function createPaginatedQueryDto<T extends z.ZodType>(filterSchema: T) {
  return createZodDto(createPaginatedQuerySchema(filterSchema));
}
