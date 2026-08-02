import type { z } from 'zod';

import type {
  createShowIssueInputSchema,
  escalateShowIssueInputSchema,
  listShowIssuesFilterSchema,
  reopenShowIssueInputSchema,
  resolveShowIssueInputSchema,
  showIssueApiResponseSchema,
  showIssueCategorySchema,
  showIssueOriginSchema,
  showIssueResolutionCodeSchema,
  showIssueSeveritySchema,
  showIssueStatusSchema,
  updateShowIssueInputSchema,
} from './schemas.js';

export type ShowIssueCategory = z.infer<typeof showIssueCategorySchema>;
export type ShowIssueOrigin = z.infer<typeof showIssueOriginSchema>;
export type ShowIssueSeverity = z.infer<typeof showIssueSeveritySchema>;
export type ShowIssueStatus = z.infer<typeof showIssueStatusSchema>;
export type ShowIssueResolutionCode = z.infer<typeof showIssueResolutionCodeSchema>;
export type ShowIssueApiResponse = z.infer<typeof showIssueApiResponseSchema>;
export type CreateShowIssueInput = z.infer<typeof createShowIssueInputSchema>;
export type UpdateShowIssueInput = z.infer<typeof updateShowIssueInputSchema>;
export type ResolveShowIssueInput = z.infer<typeof resolveShowIssueInputSchema>;
export type ReopenShowIssueInput = z.infer<typeof reopenShowIssueInputSchema>;
export type EscalateShowIssueInput = z.infer<typeof escalateShowIssueInputSchema>;
export type ListShowIssuesFilter = z.infer<typeof listShowIssuesFilterSchema>;
