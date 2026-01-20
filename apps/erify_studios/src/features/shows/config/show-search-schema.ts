import { z } from 'zod';

export const showsSearchSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(10).max(100).catch(10),
  name: z.string().optional().catch(undefined),
  client_name: z.string().optional().catch(undefined),
  mc_name: z.string().optional().catch(undefined),
  start_date_from: z.string().optional().catch(undefined),
  start_date_to: z.string().optional().catch(undefined),
  sortBy: z.string().default('start_time').catch('start_time'),
  sortOrder: z.enum(['asc', 'desc']).default('desc').catch('desc'),
  id: z.string().optional().catch(undefined),
});
