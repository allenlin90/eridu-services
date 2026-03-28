import { z } from 'zod';

import { CREATOR_COMPENSATION_TYPE } from '@eridu/api-types/creators';

export const studioCreatorRosterSearchSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  limit: z.coerce.number().int().min(10).max(100).catch(10),
  search: z.string().optional().catch(undefined),
  is_active: z.enum(['true', 'false']).catch('true'),
  default_rate_type: z
    .enum(Object.values(CREATOR_COMPENSATION_TYPE) as [string, ...string[]])
    .optional()
    .catch(undefined),
});
