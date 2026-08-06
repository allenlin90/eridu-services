import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { PLANNING_READINESS_MAX_BULK_SHOW_IDS } from '@/show-orchestration/planning-readiness.service';

export const planningReadinessQuerySchema = z
  .object({
    show_id: z.union([z.string(), z.array(z.string())]),
  })
  .transform((data) => ({
    showIds: Array.isArray(data.show_id) ? data.show_id : [data.show_id],
  }))
  .refine((data) => data.showIds.length <= PLANNING_READINESS_MAX_BULK_SHOW_IDS, {
    message: `Too many show_id values (max ${PLANNING_READINESS_MAX_BULK_SHOW_IDS})`,
    path: ['show_id'],
  });

export class PlanningReadinessQueryDto extends createZodDto(planningReadinessQuerySchema) {}
