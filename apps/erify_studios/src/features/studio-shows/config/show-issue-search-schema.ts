import { z } from 'zod';

import {
  showIssueCategorySchema,
  showIssueSeveritySchema,
  showIssueStatusSchema,
} from '@eridu/api-types/show-issues';

// Single source of truth for the Issues tab's default page size, consumed by
// both this schema's `.catch()` and the tab `Link`'s `search` prop
// (route.tsx) so they can't drift apart. Must be one of `DataTablePagination`'s
// `DEFAULT_PAGE_SIZE_OPTIONS` ([10, 20, 30, 40, 50, 100]) — see
// show-issue-search-schema.test.ts for the contract test.
export const SHOW_ISSUES_DEFAULT_PAGE_SIZE = 20;

export const showIssuesSearchSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  limit: z.coerce.number().int().min(10).max(100).catch(SHOW_ISSUES_DEFAULT_PAGE_SIZE),
  search: z.string().optional().catch(undefined),
  status: showIssueStatusSchema.optional().catch(undefined),
  severity: showIssueSeveritySchema.optional().catch(undefined),
  category: showIssueCategorySchema.optional().catch(undefined),
  owner_id: z.string().optional().catch(undefined),
});
