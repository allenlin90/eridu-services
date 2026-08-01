import { z } from 'zod';

import {
  showIssueCategorySchema,
  showIssueSeveritySchema,
  showIssueStatusSchema,
} from '@eridu/api-types/show-issues';

export const showIssuesSearchSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  limit: z.coerce.number().int().min(10).max(100).catch(25),
  search: z.string().optional().catch(undefined),
  status: showIssueStatusSchema.optional().catch(undefined),
  severity: showIssueSeveritySchema.optional().catch(undefined),
  category: showIssueCategorySchema.optional().catch(undefined),
  owner_id: z.string().optional().catch(undefined),
});
