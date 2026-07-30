// ============================================================================
// Service Layer Payload Types
// ============================================================================
// NOTE: These types CAN use Prisma types to define the payload shape.
// Services import these payload types, NOT Prisma types directly.
import type { Prisma, SceneQcResult as PrismaSceneQcResult, SceneType } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import z from 'zod';

import { UID_PREFIXES } from '@eridu/api-types/constants';
import type { SceneQcFindingInput } from '@eridu/api-types/scene-qc';
import {
  createSceneQcReviewInputSchema,
  sceneQcResultSchema,
  sceneQcReviewSchema,
  sceneTypeSchema,
  updateSceneQcReviewInputSchema,
} from '@eridu/api-types/scene-qc';

import { ShowService } from '@/models/show/show.service';
import { UserService } from '@/models/user/user.service';

/**
 * Every SceneQcReview read must apply this include -- the DTO derives
 * `show_id` / `reviewed_by` from the included relations, never from the
 * internal FK columns, and evidence must be ordered for a stable
 * `sort_order`.
 */
export const sceneQcReviewDefaultInclude = {
  show: { select: { uid: true } },
  reviewedBy: { select: { uid: true, name: true } },
  evidence: { orderBy: { sortOrder: 'asc' } },
  findings: {
    orderBy: { sortOrder: 'asc' },
    include: {
      element: { select: { uid: true } },
      defect: { select: { uid: true } },
      relatedElement: { select: { uid: true } },
    },
  },
} as const satisfies Prisma.SceneQcReviewInclude;

// Internal entity shape (DB row + include -> DTO transform input).
export const sceneQcReviewEntitySchema = z.object({
  id: z.bigint(),
  uid: z.string().startsWith(UID_PREFIXES.SCENE_QC_REVIEW),
  show: z.object({ uid: z.string().startsWith(ShowService.UID_PREFIX) }),
  operationalDate: z.date(),
  windowStart: z.date(),
  windowEnd: z.date(),
  timezone: z.string(),
  result: sceneQcResultSchema,
  feedback: z.string().nullable(),
  reviewedBy: z.object({ uid: z.string().startsWith(UserService.UID_PREFIX), name: z.string() }),
  reviewedAt: z.date(),
  expectedObjectKey: z.string().nullable(),
  expectedFileUrl: z.string().nullable(),
  expectedSceneType: sceneTypeSchema.nullable(),
  version: z.number().int(),
  confirmedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  evidence: z.array(z.object({
    sortOrder: z.number().int(),
    sourceTaskUid: z.string(),
    sourceTaskVersion: z.number().int(),
    sourceFieldKey: z.string(),
    sourceLabel: z.string(),
    objectKey: z.string().nullable(),
    fileUrl: z.string(),
  })),
  findings: z.array(z.object({
    element: z.object({ uid: z.string() }),
    elementKey: z.string(),
    elementLabel: z.string(),
    defect: z.object({ uid: z.string() }),
    defectKey: z.string(),
    defectLabel: z.string(),
    relatedElement: z.object({ uid: z.string() }).nullable(),
    relatedElementKey: z.string().nullable(),
    relatedElementLabel: z.string().nullable(),
  })),
});

export const sceneQcReviewDto = sceneQcReviewEntitySchema
  .transform((obj) => ({
    id: obj.uid,
    show_id: obj.show.uid,
    // Date-only operational anchor stored at UTC midnight -- the documented
    // date-only-column exception where `.slice(0, 10)` IS the correct
    // serializer (see operations-review-surface skill).
    operational_date: obj.operationalDate.toISOString().slice(0, 10),
    window_start: obj.windowStart.toISOString(),
    window_end: obj.windowEnd.toISOString(),
    timezone: obj.timezone,
    result: obj.result,
    feedback: obj.feedback,
    findings: obj.findings.map((finding) => ({
      element_id: finding.element.uid,
      element_key: finding.elementKey,
      element_label: finding.elementLabel,
      defect_id: finding.defect.uid,
      defect_key: finding.defectKey,
      defect_label: finding.defectLabel,
      related_element_id: finding.relatedElement?.uid ?? null,
      related_element_key: finding.relatedElementKey,
      related_element_label: finding.relatedElementLabel,
    })),
    reviewed_by: { id: obj.reviewedBy.uid, name: obj.reviewedBy.name },
    reviewed_at: obj.reviewedAt.toISOString(),
    expected_reference: obj.expectedFileUrl
      ? {
          object_key: obj.expectedObjectKey,
          file_url: obj.expectedFileUrl,
          scene_type: obj.expectedSceneType!,
        }
      : null,
    version: obj.version,
    confirmed_at: obj.confirmedAt ? obj.confirmedAt.toISOString() : null,
    created_at: obj.createdAt.toISOString(),
    updated_at: obj.updatedAt.toISOString(),
    evidence: obj.evidence.map((item) => ({
      sort_order: item.sortOrder,
      // The denormalized UID, never the (possibly SetNull'd) live relation --
      // see OQ-4. This is what keeps a historical evidence row attributable
      // after ShowOrchestrationService hard-deletes an orphaned Task.
      source_task_id: item.sourceTaskUid,
      source_task_version: item.sourceTaskVersion,
      source_field_key: item.sourceFieldKey,
      label: item.sourceLabel,
      object_key: item.objectKey,
      file_url: item.fileUrl,
    })),
  }))
  .pipe(sceneQcReviewSchema);

export class SceneQcReviewDto extends createZodDto(sceneQcReviewDto) {}

// API input schemas (snake_case input, transforms to camelCase payload).
export const createSceneQcReviewSchema = createSceneQcReviewInputSchema.transform((data) => ({
  showId: data.show_id,
  operationalDate: data.operational_date,
  result: data.result,
  feedback: data.feedback ?? null,
  findings: data.findings,
}));
export class CreateSceneQcReviewDto extends createZodDto(createSceneQcReviewSchema) {}

export const updateSceneQcReviewSchema = updateSceneQcReviewInputSchema.transform((data) => ({
  result: data.result,
  feedback: data.feedback ?? null,
  findings: data.findings,
  version: data.version,
}));
export class UpdateSceneQcReviewDto extends createZodDto(updateSceneQcReviewSchema) {}

/** Request-derived context every Scene QC review mutation needs for audit provenance. */
export type SceneQcReviewMutationContext = { actorExtId: string; studioUid: string };

export type CreateSceneQcReviewPayload = {
  showId: string;
  operationalDate: string;
  result: PrismaSceneQcResult;
  feedback: string | null;
  findings?: SceneQcFindingInput[];
};

export type UpdateSceneQcReviewPayload = {
  result: PrismaSceneQcResult;
  feedback: string | null;
  findings?: SceneQcFindingInput[];
  version: number;
};

/**
 * Persisted SceneQcReview row with the included relations every read/write
 * path must select.
 */
export type SceneQcReviewRecord = z.infer<typeof sceneQcReviewEntitySchema>;

/** One evidence row pinned onto a persisted review (repository write shape). */
export type PinnedEvidenceInput = {
  sortOrder: number;
  sourceTaskId: bigint | null;
  sourceTaskUid: string;
  sourceTaskVersion: number;
  sourceFieldKey: string;
  sourceLabel: string;
  objectKey: string | null;
  fileUrl: string;
};

export type PinnedFindingInput = {
  sortOrder: number;
  elementId: bigint;
  elementKey: string;
  elementLabel: string;
  defectId: bigint;
  defectKey: string;
  defectLabel: string;
  relatedElementId: bigint | null;
  relatedElementKey: string | null;
  relatedElementLabel: string | null;
};

/** The fields the §8.2 review save transaction can mutate on the head row. */
export type ReviewMutablePersistenceFields = {
  result: PrismaSceneQcResult;
  feedback: string | null;
  reviewedById: bigint;
  reviewedAt: Date;
  expectedObjectKey: string | null;
  expectedFileUrl: string | null;
  expectedSceneType: SceneType | null;
};

export type CreateReviewPersistenceInput = ReviewMutablePersistenceFields & {
  showId: bigint;
  operationalDate: Date;
  windowStart: Date;
  windowEnd: Date;
  timezone: string;
  evidence: PinnedEvidenceInput[];
  findings: PinnedFindingInput[];
};

/**
 * Lean projection of a Show eligible for Scene QC within a resolved window.
 * `deletedAt` is always `null` here -- both repository read methods already
 * filter `deletedAt: null` at the DB level -- kept on the type only so this
 * row satisfies `SceneQcShowEligibilityInput` without a manual cast at every
 * `isShowEligibleForSceneQc` call site.
 */
export type EligibleShowRow = {
  id: bigint;
  uid: string;
  name: string;
  startTime: Date;
  deletedAt: null;
  statusSystemKey: string | null;
  client: { id: bigint; uid: string; name: string } | null;
  platforms: Array<{ uid: string; name: string }>;
};

/** Lean review-head projection for the daily items/summary read models. */
export type ReviewHeadRow = {
  id: bigint;
  uid: string;
  showId: bigint;
  result: PrismaSceneQcResult;
  feedback: string | null;
  version: number;
  confirmedAt: Date | null;
  reviewedBy: { uid: string; name: string };
  reviewedAt: Date;
  evidenceCount: number;
};
