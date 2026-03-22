import { z } from 'zod';

export const showStatusesSearchSchema = z.object({
  page: z.number().int().min(1).catch(1),
  limit: z.number().int().min(10).max(100).catch(10),
  name: z.string().optional().catch(undefined),
  id: z.string().optional().catch(undefined),
});
