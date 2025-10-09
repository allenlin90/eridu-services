import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const paginationQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1).optional(),
  limit: z.coerce.number().min(1).default(10).optional(),
});

export type PaginationQuerySchema = z.infer<typeof paginationQuerySchema>;

export class PaginationQueryDto extends createZodDto(paginationQuerySchema) {}
