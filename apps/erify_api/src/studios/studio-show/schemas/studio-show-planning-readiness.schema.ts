import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const MAX_BULK_SHOW_IDS = 100;

export const planningReadinessQuerySchema = z
  .object({
    show_id: z.union([z.string(), z.array(z.string())]),
  })
  .transform((data) => ({
    showIds: Array.isArray(data.show_id) ? data.show_id : [data.show_id],
  }))
  .refine((data) => data.showIds.length <= MAX_BULK_SHOW_IDS, {
    message: `Too many show_id values (max ${MAX_BULK_SHOW_IDS})`,
    path: ['show_id'],
  });

export class PlanningReadinessQueryDto extends createZodDto(planningReadinessQuerySchema) {}
