import { z } from 'zod';

export const studioMembersSearchSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  limit: z.coerce.number().int().min(10).max(100).catch(10),
  search: z.string().optional().catch(undefined),
});
