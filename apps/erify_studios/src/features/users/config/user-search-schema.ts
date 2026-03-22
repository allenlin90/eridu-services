import { z } from 'zod';

export const usersSearchSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  limit: z.coerce.number().int().min(10).max(100).catch(10),
  name: z.string().optional().catch(undefined),
  email: z.string().optional().catch(undefined),
  id: z.string().optional().catch(undefined),
  ext_id: z.string().optional().catch(undefined),
  is_system_admin: z.string().optional().catch(undefined),
});
