import { createZodDto } from 'nestjs-zod';
import z from 'zod';

import { paginationBaseSchema, transformPagination } from '@/lib/pagination/pagination.schema';

const rateTypeFilterSchema = z.enum(['FIXED', 'COMMISSION', 'HYBRID', 'NONE']);

export const listStudioMcRosterQuerySchema = paginationBaseSchema
  .extend({
    search: z.string().trim().optional(),
    is_active: z
      .union([z.boolean(), z.enum(['true', 'false'])])
      .transform((value) => (typeof value === 'string' ? value === 'true' : value))
      .optional(),
    default_rate_type: rateTypeFilterSchema.optional(),
  })
  .transform((data) => {
    const pagination = transformPagination(data);
    return {
      ...pagination,
      search: data.search,
      isActive: data.is_active,
      defaultRateType: data.default_rate_type === 'NONE' ? null : data.default_rate_type,
    };
  });

export class ListStudioCreatorRosterQueryDto extends createZodDto(listStudioMcRosterQuerySchema) {
  declare page: number;
  declare limit: number;
  declare take: number;
  declare skip: number;
  declare search: string | undefined;
  declare isActive: boolean | undefined;
  declare defaultRateType: 'FIXED' | 'COMMISSION' | 'HYBRID' | null | undefined;
}

export type ListStudioCreatorRosterQueryPayload = z.infer<typeof listStudioMcRosterQuerySchema>;
export { ListStudioCreatorRosterQueryDto as ListStudioMcRosterQueryDto };
export type ListStudioMcRosterQueryPayload = ListStudioCreatorRosterQueryPayload;
