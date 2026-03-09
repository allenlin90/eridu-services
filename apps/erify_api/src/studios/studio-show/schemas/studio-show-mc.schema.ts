import { createZodDto } from 'nestjs-zod';
import z from 'zod';

import { CREATOR_COMPENSATION_TYPE } from '@eridu/api-types/creators';

import { paginationQuerySchema } from '@/lib/pagination/pagination.schema';
import { CreatorService } from '@/models/creator/creator.service';
import { showCreatorDto } from '@/models/show-mc/schemas/show-mc.schema';

export const listShowCreatorsQuerySchema = paginationQuerySchema;

export class ListShowCreatorsQueryDto extends createZodDto(listShowCreatorsQuerySchema) {
  declare page: number;
  declare limit: number;
  declare take: number;
  declare skip: number;
  declare sort: 'asc' | 'desc';
}

export const addShowCreatorInputSchema = z.object({
  creator_id: z.string().startsWith(CreatorService.UID_PREFIX),
  note: z.string().max(1000).optional(),
  agreed_rate: z.coerce.number().positive().optional(),
  compensation_type: z
    .enum(Object.values(CREATOR_COMPENSATION_TYPE) as [string, ...string[]])
    .optional(),
  commission_rate: z.coerce.number().min(0).max(100).optional(),
});

export class AddShowCreatorDto extends createZodDto(addShowCreatorInputSchema) {}

export { showCreatorDto };
export type AddShowCreatorInput = z.infer<typeof addShowCreatorInputSchema>;
