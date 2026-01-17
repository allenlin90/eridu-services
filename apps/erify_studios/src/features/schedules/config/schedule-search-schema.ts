import { z } from 'zod';

export const schedulesSearchSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(10).max(100).catch(10),
  name: z.string().optional().catch(undefined),
  client_name: z.string().optional().catch(undefined),
  id: z.string().optional().catch(undefined),
});
