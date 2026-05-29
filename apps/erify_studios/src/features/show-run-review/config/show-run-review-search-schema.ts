import { z } from 'zod';

export const showRunReviewSearchSchema = z.object({
  date_from: z.string().optional().catch(undefined),
  date_to: z.string().optional().catch(undefined),
  tab: z.enum(['creators', 'violations', 'tasks', 'shows']).catch('creators'),
  creators_search: z.string().optional().catch(undefined),
  creators_status: z.enum(['LATE', 'MISSING']).optional().catch(undefined),
  creators_page: z.coerce.number().int().min(1).optional().catch(1),
  violations_search: z.string().optional().catch(undefined),
  violations_severity: z.string().optional().catch(undefined),
  violations_page: z.coerce.number().int().min(1).optional().catch(1),
  tasks_search: z.string().optional().catch(undefined),
  tasks_status: z.string().optional().catch(undefined),
  tasks_page: z.coerce.number().int().min(1).optional().catch(1),
  shows_search: z.string().optional().catch(undefined),
  shows_completeness: z.string().optional().catch(undefined),
  shows_page: z.coerce.number().int().min(1).optional().catch(1),
});

export type ShowRunReviewSearch = z.infer<typeof showRunReviewSearchSchema>;
