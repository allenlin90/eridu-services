import { z } from 'zod';

export const usersSearchSchema = z.object({
  page: z.number().int().min(1).catch(1),
  pageSize: z.number().int().min(10).max(100).catch(10),
  name: z.string().optional().catch(undefined),
  email: z.string().optional().catch(undefined),
  id: z.string().optional().catch(undefined),
  ext_id: z.string().optional().catch(undefined),
});
