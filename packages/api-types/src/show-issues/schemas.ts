import { z } from 'zod';

import { UID_PREFIXES } from '../constants.js';

/**
 * Show-level issue ownership contract (Phase 5 item 9). Advisory operational
 * record for exceptions that need ownership and resolution — distinct from
 * Task (executable work) and Audit (immutable history). See
 * apps/erify_api/docs/SHOW_ISSUE_OWNERSHIP.md.
 */

export const showIssueCategorySchema = z.enum([
  'CREATOR_ATTENDANCE',
  'EQUIPMENT',
  'UTILITY',
  'PLATFORM_VIOLATION',
  'POST_PRODUCTION_FOLLOW_UP',
  'OTHER',
]);

export const showIssueOriginSchema = z.enum(['MANUAL', 'FACT_EXTRACTION']);

export const showIssueSeveritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

export const showIssueStatusSchema = z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED']);

export const showIssueResolutionCodeSchema = z.enum([
  'FIXED',
  'SOURCE_CORRECTED',
  'NO_LONGER_APPLICABLE',
  'DUPLICATE',
  'OTHER',
]);

const showIssueActorRefSchema = z.object({
  uid: z.string().startsWith(UID_PREFIXES.USER),
  name: z.string(),
});

/**
 * List/detail response shape. List responses exclude audit history — the
 * audit timeline is served separately by `GET .../show-issues/:id/audits`.
 */
export const showIssueApiResponseSchema = z.object({
  id: z.string().startsWith(UID_PREFIXES.SHOW_ISSUE),
  show_id: z.string().startsWith(UID_PREFIXES.SHOW),
  show_name: z.string(),
  category: showIssueCategorySchema,
  origin: showIssueOriginSchema,
  severity: showIssueSeveritySchema,
  status: showIssueStatusSchema,
  title: z.string(),
  evidence: z.string().nullable(),
  owner: showIssueActorRefSchema.nullable(),
  due_at: z.iso.datetime().nullable(),
  created_by: showIssueActorRefSchema.nullable(),
  escalation_level: z.number().int().nonnegative(),
  escalated_at: z.iso.datetime().nullable(),
  escalated_by: showIssueActorRefSchema.nullable(),
  escalation_note: z.string().nullable(),
  resolved_at: z.iso.datetime().nullable(),
  resolved_by: showIssueActorRefSchema.nullable(),
  resolution_code: showIssueResolutionCodeSchema.nullable(),
  resolution_note: z.string().nullable(),
  // Typed automated-source references. Always null for MANUAL issues.
  show_creator_id: z.string().nullable(),
  show_platform_violation_id: z.string().nullable(),
  version: z.number().int().nonnegative(),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
});

/**
 * Manual-issue creation. `origin` is never accepted from the public API — it
 * is always `MANUAL` for this endpoint. Automated-origin issues are created
 * only by the (not-yet-built) reconciliation workflow.
 */
export const createShowIssueInputSchema = z.object({
  // ShowIssue is a top-level studio-scoped collection (its own UID, audit
  // trail, pagination, and soft-delete lifecycle), not nested under
  // `/shows/:id/` — the target show is an explicit create field instead of a
  // path parameter.
  show_id: z.string().startsWith(UID_PREFIXES.SHOW),
  category: showIssueCategorySchema,
  severity: showIssueSeveritySchema,
  title: z.string().min(1, 'Title is required'),
  evidence: z.string().nullable().optional(),
  owner_id: z.string().startsWith(UID_PREFIXES.USER).nullable().optional(),
  due_at: z.iso.datetime().nullable().optional(),
});

/**
 * Generic field edit. `status` accepts only `IN_PROGRESS` here (the "start"
 * transition) — resolving and reopening use their own commands because they
 * require a resolution/reopen reason. Automated origin and source fields
 * (`origin`, `show_creator_id`, `show_platform_violation_id`) are immutable
 * through the public API and therefore absent from this schema.
 */
export const updateShowIssueInputSchema = z.object({
  version: z.number().int().nonnegative(),
  category: showIssueCategorySchema.optional(),
  severity: showIssueSeveritySchema.optional(),
  status: z.literal('IN_PROGRESS').optional(),
  title: z.string().min(1, 'Title is required').optional(),
  evidence: z.string().nullable().optional(),
  owner_id: z.string().startsWith(UID_PREFIXES.USER).nullable().optional(),
  due_at: z.iso.datetime().nullable().optional(),
}).refine(
  (data) => data.category !== undefined
    || data.severity !== undefined
    || data.status !== undefined
    || data.title !== undefined
    || data.evidence !== undefined
    || data.owner_id !== undefined
    || data.due_at !== undefined,
  { message: 'At least one editable field must be provided.' },
);

export const resolveShowIssueInputSchema = z.object({
  version: z.number().int().nonnegative(),
  resolution_code: showIssueResolutionCodeSchema,
  resolution_note: z.string().min(1, 'Resolution note is required'),
});

export const reopenShowIssueInputSchema = z.object({
  version: z.number().int().nonnegative(),
  reason: z.string().min(1, 'Reason is required'),
});

export const escalateShowIssueInputSchema = z.object({
  version: z.number().int().nonnegative(),
  escalation_note: z.string().min(1).optional(),
});

/**
 * Business filters for the canonical show-issue collection. Pagination
 * (`page`/`limit`) is layered on by the consuming app's own pagination
 * schema, matching `listShowsFilterSchema` in `@eridu/api-types/shows`.
 */
export const listShowIssuesFilterSchema = z.object({
  show_id: z.string().startsWith(UID_PREFIXES.SHOW).optional(),
  owner_id: z.string().startsWith(UID_PREFIXES.USER).optional(),
  status: showIssueStatusSchema.optional(),
  severity: showIssueSeveritySchema.optional(),
  category: showIssueCategorySchema.optional(),
  origin: showIssueOriginSchema.optional(),
  date_from: z.iso.datetime().optional(),
  date_to: z.iso.datetime().optional(),
  search: z.string().optional(),
});
