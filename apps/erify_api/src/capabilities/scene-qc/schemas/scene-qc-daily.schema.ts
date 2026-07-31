import { createZodDto } from 'nestjs-zod';

import type {
  SceneQcBlockedReason,
  SceneQcConfirmationState,
  SceneQcDailyItem,
  SceneQcDailySummary,
  SceneQcExpectedReference,
  SceneQcReviewState,
} from '@eridu/api-types/scene-qc';
import {
  SCENE_QC_REVIEW_STATE,
  sceneQcItemDetailQuerySchema,
  sceneQcItemsQuerySchema,
  sceneQcSummaryQuerySchema,
} from '@eridu/api-types/scene-qc';

import type { ConfirmationScopeDiff } from '../scene-qc-confirmation-state.policy';

import type { EligibleShowRow, ReviewHeadRow } from './scene-qc-review.schema';

// ============================================================================
// Query DTOs (snake_case input, transforms to camelCase payload)
// ============================================================================

export const sceneQcSummaryQueryDtoSchema = sceneQcSummaryQuerySchema.transform((data) => ({
  operationalDate: data.operational_date,
}));
export class SceneQcSummaryQueryDto extends createZodDto(sceneQcSummaryQueryDtoSchema) {}

export const sceneQcItemsQueryDtoSchema = sceneQcItemsQuerySchema.transform((data) => ({
  operationalDate: data.operational_date,
  clientId: data.client_id,
  platformId: data.platform_id,
  reviewState: data.review_state,
  search: data.search,
  page: data.page,
  limit: data.limit,
}));
export class SceneQcItemsQueryDto extends createZodDto(sceneQcItemsQueryDtoSchema) {}

export const sceneQcItemDetailQueryDtoSchema = sceneQcItemDetailQuerySchema.transform((data) => ({
  operationalDate: data.operational_date,
}));
export class SceneQcItemDetailQueryDto extends createZodDto(sceneQcItemDetailQueryDtoSchema) {}

// ============================================================================
// Read-model -> DTO mappers (camelCase payload -> snake_case API response)
// ============================================================================

export type SceneQcDailySummaryCounts = {
  operationalDate: string;
  windowStart: Date;
  windowEnd: Date;
  timezone: string;
  eligibleCount: number;
  reviewedCount: number;
  passCount: number;
  minorCount: number;
  failCount: number;
  blockedNoEvidenceCount: number;
};

/** Real confirmation state for the day, resolved via `resolveSceneQcConfirmationState`. See breakdown section 1.9. */
export type SceneQcDailySummaryConfirmationInfo = {
  state: SceneQcConfirmationState;
  confirmationUid: string | null;
  revision: number | null;
  confirmedBy: { uid: string; name: string } | null;
  confirmedAt: Date | null;
  diff: ConfirmationScopeDiff | null;
};

export function toSceneQcDailySummaryDto(
  counts: SceneQcDailySummaryCounts,
  confirmation: SceneQcDailySummaryConfirmationInfo,
): SceneQcDailySummary {
  return {
    operational_date: counts.operationalDate,
    window_start: counts.windowStart.toISOString(),
    window_end: counts.windowEnd.toISOString(),
    timezone: counts.timezone,
    eligible_count: counts.eligibleCount,
    reviewed_count: counts.reviewedCount,
    pass_count: counts.passCount,
    minor_count: counts.minorCount,
    fail_count: counts.failCount,
    blocked_no_evidence_count: counts.blockedNoEvidenceCount,
    remaining_count: counts.eligibleCount - counts.reviewedCount,
    confirmation: confirmation.state,
    confirmation_id: confirmation.confirmationUid,
    confirmation_revision: confirmation.revision,
    confirmed_by: confirmation.confirmedBy
      ? { id: confirmation.confirmedBy.uid, name: confirmation.confirmedBy.name }
      : null,
    confirmed_at: confirmation.confirmedAt ? confirmation.confirmedAt.toISOString() : null,
    confirmation_added_show_count: confirmation.diff?.addedShowCount ?? null,
    confirmation_removed_show_count: confirmation.diff?.removedShowCount ?? null,
    confirmation_changed_review_count: confirmation.diff?.changedReviewCount ?? null,
  };
}

export type SceneQcDailyItemInput = {
  show: EligibleShowRow;
  evidenceCount: number;
  hasSceneProfile: boolean;
  reviewHead: ReviewHeadRow | null;
};

/** `is_blocked` is a live-evidence fact: zero currently-resolvable evidence, regardless of a prior review head. */
export function isSceneQcItemBlocked(evidenceCount: number): boolean {
  return evidenceCount === 0;
}

/** The single review_state bucket an item filters into (blocked takes priority over reviewed/unreviewed). */
export function classifySceneQcReviewState(input: SceneQcDailyItemInput): SceneQcReviewState {
  if (isSceneQcItemBlocked(input.evidenceCount)) {
    return SCENE_QC_REVIEW_STATE.BLOCKED;
  }
  return input.reviewHead ? SCENE_QC_REVIEW_STATE.REVIEWED : SCENE_QC_REVIEW_STATE.UNREVIEWED;
}

export function toSceneQcDailyItemDto(input: SceneQcDailyItemInput): SceneQcDailyItem {
  const { show, reviewHead } = input;
  return {
    show_id: show.uid,
    show_name: show.name,
    scheduled_start_time: show.startTime.toISOString(),
    client: show.client ? { id: show.client.uid, name: show.client.name } : null,
    platforms: show.platforms.map((platform) => ({ id: platform.uid, name: platform.name })),
    evidence_count: input.evidenceCount,
    has_scene_profile: input.hasSceneProfile,
    is_blocked: isSceneQcItemBlocked(input.evidenceCount),
    result: reviewHead?.result ?? null,
    has_feedback: Boolean(reviewHead?.feedback && reviewHead.feedback.trim().length > 0),
    reviewed_by: reviewHead ? { id: reviewHead.reviewedBy.uid, name: reviewHead.reviewedBy.name } : null,
    reviewed_at: reviewHead ? reviewHead.reviewedAt.toISOString() : null,
    review_id: reviewHead?.uid ?? null,
    review_version: reviewHead?.version ?? null,
    is_confirmed: Boolean(reviewHead?.confirmedAt),
  };
}

export function toSceneQcExpectedReferenceDto(
  profile: { objectKey: string; fileUrl: string; sceneType: SceneQcExpectedReference['scene_type'] } | null,
): SceneQcExpectedReference | null {
  return profile
    ? { object_key: profile.objectKey, file_url: profile.fileUrl, scene_type: profile.sceneType }
    : null;
}

export function resolveSceneQcBlockedReason(input: {
  evidenceCount: number;
  reviewConfirmed: boolean;
}): SceneQcBlockedReason | null {
  if (input.reviewConfirmed) {
    return 'CONFIRMED';
  }
  if (input.evidenceCount === 0) {
    return 'NO_EVIDENCE';
  }
  return null;
}
