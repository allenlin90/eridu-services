// ============================================================================
// Service Layer Payload Types
// ============================================================================
// NOTE: These types CAN use Prisma types to define the payload shape.
// Services import these payload types, NOT Prisma types directly.
import type { SceneQcResult as PrismaSceneQcResult, SceneType } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';

import type { SceneQcConfirmation } from '@eridu/api-types/scene-qc';
import { createSceneQcConfirmationInputSchema } from '@eridu/api-types/scene-qc';

// ============================================================================
// API input schemas (snake_case input, transforms to camelCase payload).
// ============================================================================

export const createSceneQcConfirmationSchema = createSceneQcConfirmationInputSchema.transform((data) => ({
  operationalDate: data.operational_date,
}));
export class CreateSceneQcConfirmationDto extends createZodDto(createSceneQcConfirmationSchema) {}

export type CreateSceneQcConfirmationPayload = { operationalDate: string };

/** Request-derived context every Scene QC confirmation command needs for audit provenance. */
export type SceneQcConfirmationMutationContext = { actorExtId: string; studioUid: string };

// ============================================================================
// Confirmation response record -> DTO mapper
// ============================================================================

export type SceneQcConfirmationRecord = {
  uid: string;
  operationalDate: Date;
  windowStart: Date;
  windowEnd: Date;
  timezone: string;
  revision: number;
  confirmedBy: { uid: string; name: string };
  confirmedAt: Date;
  showCount: number;
  passCount: number;
  minorCount: number;
  failCount: number;
};

export function toSceneQcConfirmationDto(record: SceneQcConfirmationRecord): SceneQcConfirmation {
  return {
    id: record.uid,
    operational_date: record.operationalDate.toISOString().slice(0, 10),
    window_start: record.windowStart.toISOString(),
    window_end: record.windowEnd.toISOString(),
    timezone: record.timezone,
    revision: record.revision,
    confirmed_by: { id: record.confirmedBy.uid, name: record.confirmedBy.name },
    confirmed_at: record.confirmedAt.toISOString(),
    show_count: record.showCount,
    pass_count: record.passCount,
    minor_count: record.minorCount,
    fail_count: record.failCount,
  };
}

// ============================================================================
// Repository-facing domain types (SceneQcConfirmationRepository)
// ============================================================================

/** One (showId, reviewId, reviewVersion) triple pinned onto a confirmation revision. */
export type PinnedScopeItem = { showId: bigint; reviewId: bigint; reviewVersion: number };

/** Backs the daily summary's CURRENT/STALE state (`findLatestConfirmationWithScope`). */
export type ConfirmationWithScope = {
  id: bigint;
  uid: string;
  revision: number;
  confirmedAt: Date;
  confirmedBy: { uid: string; name: string };
  items: PinnedScopeItem[];
};

/** Latest confirmation item pinning a given review -- Records list/detail (OQ-30). */
export type ConfirmationRef = {
  confirmationId: bigint;
  confirmationUid: string;
  revision: number;
  confirmedBy: { uid: string; name: string };
  confirmedAt: Date;
  /** Whether `revision` is the highest revision for this confirmation's (studio, operational date). */
  isLatestRevisionForDay: boolean;
};

export type AppendConfirmationItemPlatformInput = {
  platformId: bigint | null;
  platformUid: string;
  platformName: string;
};

export type AppendConfirmationItemInput = {
  showId: bigint;
  reviewId: bigint;
  reviewVersion: number;
  showUid: string;
  showName: string;
  scheduledStartTime: Date;
  clientId: bigint;
  clientUid: string;
  clientName: string;
  platforms: AppendConfirmationItemPlatformInput[];
};

export type AppendConfirmationInput = {
  // Resolved via `connect: { uid }` inside the repository -- SceneQcModule
  // does not import StudioModule, so the workflow never resolves Studio's
  // bigint id itself (see SCENE_QC_CHILD_PR_4_BREAKDOWN.md section 1.3).
  studioUid: string;
  operationalDate: Date;
  windowStart: Date;
  windowEnd: Date;
  timezone: string;
  revision: number;
  confirmedById: bigint;
  confirmedAt: Date;
  items: AppendConfirmationItemInput[];
};

/** Full report payload source: confirmation + items + platforms + each item's pinned review. */
export type ConfirmationReportItemRow = {
  showId: bigint;
  reviewId: bigint;
  reviewVersion: number;
  showUid: string;
  showName: string;
  scheduledStartTime: Date;
  clientUid: string;
  clientName: string;
  platforms: Array<{ platformUid: string; platformName: string }>;
  review: {
    result: PrismaSceneQcResult;
    feedback: string | null;
    reviewedBy: { uid: string; name: string };
    reviewedAt: Date;
    evidenceCount: number;
    expectedSceneType: SceneType | null;
  };
};

export type ConfirmationReportRow = {
  id: bigint;
  uid: string;
  studioId: bigint;
  studio: { uid: string; name: string };
  revision: number;
  operationalDate: Date;
  windowStart: Date;
  windowEnd: Date;
  timezone: string;
  confirmedBy: { uid: string; name: string };
  confirmedAt: Date;
  items: ConfirmationReportItemRow[];
};
