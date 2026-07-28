import { z } from 'zod';

import { UID_PREFIXES } from '../constants.js';
import { createPaginatedResponseSchema, paginationBaseSchema } from '../pagination/schemas.js';

import { sceneTypeSchema } from './schemas.js';

/**
 * Scene QC Daily Review contracts — Child PR 3. See
 * `apps/erify_api/docs/design/SCENE_QC_CHILD_PR_3_BREAKDOWN.md` section 2.
 * Kept in a separate module from `schemas.ts` (Scene Profile) so neither file
 * grows oversized; Child PR 4 adds `records.schemas.ts` alongside this one.
 */

// ============================================================================
// Constants and enums
// ============================================================================

export const SCENE_QC_RESULT = { PASS: 'PASS', MINOR: 'MINOR', FAIL: 'FAIL' } as const;
export type SceneQcResult = (typeof SCENE_QC_RESULT)[keyof typeof SCENE_QC_RESULT];
export const sceneQcResultSchema = z.enum(Object.values(SCENE_QC_RESULT) as [SceneQcResult, ...SceneQcResult[]]);

export const SCENE_QC_REVIEW_STATE = {
  ALL: 'all',
  UNREVIEWED: 'unreviewed',
  REVIEWED: 'reviewed',
  BLOCKED: 'blocked',
} as const;
export type SceneQcReviewState = (typeof SCENE_QC_REVIEW_STATE)[keyof typeof SCENE_QC_REVIEW_STATE];
export const sceneQcReviewStateSchema = z.enum(
  Object.values(SCENE_QC_REVIEW_STATE) as [SceneQcReviewState, ...SceneQcReviewState[]],
);

export const SCENE_QC_CONFIRMATION_STATE = {
  UNCONFIRMED: 'UNCONFIRMED',
  CURRENT: 'CURRENT',
  STALE: 'STALE',
} as const;
export type SceneQcConfirmationState = (typeof SCENE_QC_CONFIRMATION_STATE)[keyof typeof SCENE_QC_CONFIRMATION_STATE];
export const sceneQcConfirmationStateSchema = z.enum(
  Object.values(SCENE_QC_CONFIRMATION_STATE) as [SceneQcConfirmationState, ...SceneQcConfirmationState[]],
);

/**
 * Hoisted so the browser can compute the DEFAULT operational date in the same
 * zone the server resolves windows in. See OQ-10 in the Child PR 3 breakdown.
 * `apps/erify_api/src/capabilities/scene-qc/scene-qc-operational-window.util.ts`
 * re-exports this constant as `OPERATIONAL_TIMEZONE` rather than declaring the
 * literal, so there is exactly one source of truth.
 */
export const SCENE_QC_OPERATIONAL_TIMEZONE = 'Asia/Bangkok';
export const SCENE_QC_OPERATIONAL_DAY_START_HOUR = 6;

export const operationalDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

// ============================================================================
// Shared object shapes
// ============================================================================

const sceneQcClientRefSchema = z.object({
  id: z.string().startsWith(UID_PREFIXES.CLIENT),
  name: z.string(),
});

const sceneQcPlatformRefSchema = z.object({
  id: z.string().startsWith(UID_PREFIXES.PLATFORM),
  name: z.string(),
});

const sceneQcUserRefSchema = z.object({
  id: z.string().startsWith(UID_PREFIXES.USER),
  name: z.string(),
});

export const sceneQcOperationalWindowSchema = z.object({
  operational_date: operationalDateSchema,
  window_start: z.iso.datetime(),
  window_end: z.iso.datetime(),
  timezone: z.string().min(1),
});

// ============================================================================
// Query schemas
// ============================================================================

export const sceneQcSummaryQuerySchema = z.object({
  operational_date: operationalDateSchema,
});

export const sceneQcItemsQuerySchema = paginationBaseSchema.extend({
  operational_date: operationalDateSchema,
  client_id: z.string().startsWith(UID_PREFIXES.CLIENT).optional(),
  platform_id: z.string().startsWith(UID_PREFIXES.PLATFORM).optional(),
  review_state: sceneQcReviewStateSchema.default(SCENE_QC_REVIEW_STATE.ALL),
  search: z.string().trim().min(1).max(100).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const sceneQcItemDetailQuerySchema = z.object({
  operational_date: operationalDateSchema,
});

// ============================================================================
// Response schemas
// ============================================================================

export const sceneQcDailySummarySchema = sceneQcOperationalWindowSchema.extend({
  eligible_count: z.number().int().min(0),
  reviewed_count: z.number().int().min(0),
  pass_count: z.number().int().min(0),
  minor_count: z.number().int().min(0),
  fail_count: z.number().int().min(0),
  blocked_no_evidence_count: z.number().int().min(0),
  remaining_count: z.number().int().min(0),
  // Child PR 4 populates these fields for real. PR 3 always returns
  // UNCONFIRMED / nulls so the contract is additive-stable across the branch.
  // TODO(scene-qc-confirmation): populate from SceneQcDailyConfirmation once
  // Child PR 4 ships confirmation persistence.
  confirmation: sceneQcConfirmationStateSchema,
  confirmation_id: z.string().nullable(),
  confirmation_revision: z.number().int().nullable(),
  confirmed_by: sceneQcUserRefSchema.nullable(),
  confirmed_at: z.iso.datetime().nullable(),
});

export const sceneQcDailyItemSchema = z.object({
  show_id: z.string().startsWith(UID_PREFIXES.SHOW),
  show_name: z.string(),
  scheduled_start_time: z.iso.datetime(),
  client: sceneQcClientRefSchema.nullable(),
  platforms: z.array(sceneQcPlatformRefSchema),
  evidence_count: z.number().int().min(0),
  has_scene_profile: z.boolean(),
  is_blocked: z.boolean(),
  result: sceneQcResultSchema.nullable(),
  has_feedback: z.boolean(),
  reviewed_by: sceneQcUserRefSchema.nullable(),
  reviewed_at: z.iso.datetime().nullable(),
  review_id: z.string().startsWith(UID_PREFIXES.SCENE_QC_REVIEW).nullable(),
  review_version: z.number().int().nullable(),
  is_confirmed: z.boolean(),
});

export const sceneQcDailyItemsResponseSchema = createPaginatedResponseSchema(sceneQcDailyItemSchema);

export const sceneQcEvidenceSchema = z.object({
  sort_order: z.number().int().min(0),
  source_task_id: z.string().startsWith(UID_PREFIXES.TASK),
  source_task_version: z.number().int(),
  source_field_key: z.string(),
  label: z.string(),
  object_key: z.string().nullable(),
  file_url: z.string().min(1),
});

export const sceneQcExpectedReferenceSchema = z.object({
  object_key: z.string().nullable(),
  file_url: z.string().min(1),
  scene_type: sceneTypeSchema,
});

export const sceneQcReviewSchema = sceneQcOperationalWindowSchema.extend({
  id: z.string().startsWith(UID_PREFIXES.SCENE_QC_REVIEW),
  show_id: z.string().startsWith(UID_PREFIXES.SHOW),
  result: sceneQcResultSchema,
  feedback: z.string().nullable(),
  reviewed_by: sceneQcUserRefSchema,
  reviewed_at: z.iso.datetime(),
  expected_reference: sceneQcExpectedReferenceSchema.nullable(),
  version: z.number().int(),
  confirmed_at: z.iso.datetime().nullable(),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
  evidence: z.array(sceneQcEvidenceSchema),
});

const sceneQcItemDetailShowSchema = z.object({
  id: z.string().startsWith(UID_PREFIXES.SHOW),
  name: z.string(),
  scheduled_start_time: z.iso.datetime(),
  client: sceneQcClientRefSchema.nullable(),
  platforms: z.array(sceneQcPlatformRefSchema),
});

export const SCENE_QC_BLOCKED_REASON = {
  NO_EVIDENCE: 'NO_EVIDENCE',
  CONFIRMED: 'CONFIRMED',
  NOT_ELIGIBLE: 'NOT_ELIGIBLE',
} as const;
export type SceneQcBlockedReason = (typeof SCENE_QC_BLOCKED_REASON)[keyof typeof SCENE_QC_BLOCKED_REASON];
export const sceneQcBlockedReasonSchema = z.enum(
  Object.values(SCENE_QC_BLOCKED_REASON) as [SceneQcBlockedReason, ...SceneQcBlockedReason[]],
);

export const sceneQcDailyItemDetailSchema = z.object({
  show: sceneQcItemDetailShowSchema,
  operational_window: sceneQcOperationalWindowSchema,
  evidence: z.array(sceneQcEvidenceSchema),
  scene_profile: sceneQcExpectedReferenceSchema.nullable(),
  review: sceneQcReviewSchema.nullable(),
  allowed_actions: z.object({
    can_review: z.boolean(),
    blocked_reason: sceneQcBlockedReasonSchema.nullable(),
  }),
});

// ============================================================================
// Command schemas
// ============================================================================

function sceneQcFeedbackRule(
  data: { result: SceneQcResult; feedback?: string | null },
  ctx: z.RefinementCtx,
) {
  const needsFeedback = data.result === SCENE_QC_RESULT.MINOR || data.result === SCENE_QC_RESULT.FAIL;
  const provided = (data.feedback ?? '').trim().length > 0;
  if (needsFeedback && !provided) {
    ctx.addIssue({
      code: 'custom',
      path: ['feedback'],
      message: 'feedback is required for Minor and Fail results',
    });
  }
}

export const createSceneQcReviewInputSchema = z.object({
  show_id: z.string().startsWith(UID_PREFIXES.SHOW),
  operational_date: operationalDateSchema,
  result: sceneQcResultSchema,
  feedback: z.string().trim().max(2000).nullish(),
}).superRefine(sceneQcFeedbackRule);

export const updateSceneQcReviewInputSchema = z.object({
  result: sceneQcResultSchema,
  feedback: z.string().trim().max(2000).nullish(),
  version: z.number().int().positive(),
}).superRefine(sceneQcFeedbackRule);

export type SceneQcSummaryQuery = z.infer<typeof sceneQcSummaryQuerySchema>;
export type SceneQcItemsQuery = z.infer<typeof sceneQcItemsQuerySchema>;
export type SceneQcItemDetailQuery = z.infer<typeof sceneQcItemDetailQuerySchema>;
export type SceneQcDailySummary = z.infer<typeof sceneQcDailySummarySchema>;
export type SceneQcDailyItem = z.infer<typeof sceneQcDailyItemSchema>;
export type SceneQcDailyItemsResponse = z.infer<typeof sceneQcDailyItemsResponseSchema>;
export type SceneQcEvidence = z.infer<typeof sceneQcEvidenceSchema>;
export type SceneQcExpectedReference = z.infer<typeof sceneQcExpectedReferenceSchema>;
export type SceneQcReview = z.infer<typeof sceneQcReviewSchema>;
export type SceneQcDailyItemDetail = z.infer<typeof sceneQcDailyItemDetailSchema>;
export type CreateSceneQcReviewInput = z.infer<typeof createSceneQcReviewInputSchema>;
export type UpdateSceneQcReviewInput = z.infer<typeof updateSceneQcReviewInputSchema>;
