import { createZodDto } from 'nestjs-zod';
import z from 'zod';

import { CREATOR_COMPENSATION_TYPE } from '@eridu/api-types/creators';

import { paginationQuerySchema } from '@/lib/pagination/pagination.schema';
import { McService } from '@/models/mc/mc.service';
import { showMcDto } from '@/models/show-mc/schemas/show-mc.schema';

export const listShowMcsQuerySchema = paginationQuerySchema;

export class ListShowMcsQueryDto extends createZodDto(listShowMcsQuerySchema) {
  declare page: number;
  declare limit: number;
  declare take: number;
  declare skip: number;
  declare sort: 'asc' | 'desc';
}

export const addShowMcInputSchema = z.object({
  mc_id: z.string().startsWith(McService.UID_PREFIX),
  note: z.string().max(1000).optional(),
  agreed_rate: z.coerce.number().positive().optional(),
  compensation_type: z
    .enum(Object.values(CREATOR_COMPENSATION_TYPE) as [string, ...string[]])
    .optional(),
  commission_rate: z.coerce.number().min(0).max(100).optional(),
});

export class AddShowMcDto extends createZodDto(addShowMcInputSchema) {}

export { showMcDto };
export type AddShowMcInput = z.infer<typeof addShowMcInputSchema>;
