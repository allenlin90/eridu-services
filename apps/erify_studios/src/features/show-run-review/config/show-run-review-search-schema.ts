import { z } from 'zod';

import { showIssueSeveritySchema } from '@eridu/api-types/show-issues';

export const showRunReviewSearchSchema = z.object({
  date_from: z.string().optional().catch(undefined),
  date_to: z.string().optional().catch(undefined),
  tab: z.enum(['creators', 'violations', 'tasks', 'shows', 'issues']).catch('creators'),
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
  issues_search: z.string().optional().catch(undefined),
  // Unlike violations_severity (a free-form platform-reported string, no
  // fixed backend enum), issue severity IS a closed ShowIssueSeverity enum
  // — validate against it so a hand-edited/shared URL with an invalid value
  // can't reach the API and be rejected there instead.
  issues_severity: showIssueSeveritySchema.optional().catch(undefined),
  issues_page: z.coerce.number().int().min(1).optional().catch(1),
});

export type ShowRunReviewSearch = z.infer<typeof showRunReviewSearchSchema>;
