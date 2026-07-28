import { z } from 'zod';

export const sceneQcDailySearchSchema = z.object({
  tab: z.enum(['daily', 'records']).catch('daily'),
  // `undefined` means "current operational day" -- the hook resolves it via
  // getCurrentOperationalDate() and writes it into the URL on first
  // navigation so back/forward is stable (breakdown section 3.2).
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().catch(undefined),
  client_id: z.string().startsWith('client_').optional().catch(undefined),
  platform_id: z.string().startsWith('plt_').optional().catch(undefined),
  review_state: z.enum(['all', 'unreviewed', 'reviewed', 'blocked']).catch('all'),
  search: z.string().trim().min(1).max(100).optional().catch(undefined),
  show_id: z.string().startsWith('show_').optional().catch(undefined),
  page: z.coerce.number().int().min(1).catch(1),
  limit: z.coerce.number().int().min(1).max(50).catch(20),
});

export type SceneQcDailySearch = z.infer<typeof sceneQcDailySearchSchema>;
