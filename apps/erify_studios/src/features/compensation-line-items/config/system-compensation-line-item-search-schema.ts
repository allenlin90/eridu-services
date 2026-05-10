import { z } from 'zod';

export const systemCompensationLineItemSearchSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  limit: z.coerce.number().int().min(10).max(100).catch(10),
  studio_id: z.string().optional().catch(undefined),
  target_type: z.string().optional().catch(undefined),
  target_uid: z.string().optional().catch(undefined),
  item_type: z.string().optional().catch(undefined),
  created_by_uid: z.string().optional().catch(undefined),
  from: z.string().optional().catch(undefined),
  to: z.string().optional().catch(undefined),
  include_deleted: z.string().optional().catch(undefined),
});
