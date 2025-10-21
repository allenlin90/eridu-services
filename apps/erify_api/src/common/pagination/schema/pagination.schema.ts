import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// Input schema for pagination parameters
export const paginationQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).optional().default(10),
  })
  .transform((data) => ({
    page: data.page,
    limit: data.limit,
    take: data.limit,
    skip: (data.page - 1) * data.limit,
  }));

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
export const createPaginatedResponseSchema = <T extends z.ZodType>(
  itemSchema: T,
) =>
  z.object({
    data: z.array(itemSchema),
    meta: paginationMetaSchema,
  });

// DTOs and types
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export class PaginationQueryDto
  extends createZodDto(paginationQuerySchema)
  implements PaginationQuery
{
  declare page: number;
  declare limit: number;
  declare take: number;
  declare skip: number;
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
