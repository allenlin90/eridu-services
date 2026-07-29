// ============================================================================
// Service Layer Payload Types
// ============================================================================
// NOTE: These types CAN use Prisma types to define the payload shape.
// Services import these payload types, NOT Prisma types directly.
import type { SceneQcResult as PrismaSceneQcResult } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';

import type {
  SceneQcRecord,
  SceneQcRecordAuditEntry,
  SceneQcRecordDetail,
  SceneQcReportStatus,
} from '@eridu/api-types/scene-qc';
import { SCENE_QC_RECORD_CONFIRMATION_STATUS, sceneQcRecordsQuerySchema } from '@eridu/api-types/scene-qc';

import type { ConfirmationRef } from './scene-qc-confirmation.schema';
import type { SceneQcReviewRecord } from './scene-qc-review.schema';

// ============================================================================
// Query DTOs (snake_case input, transforms to camelCase payload)
// ============================================================================

export const sceneQcRecordsQueryDtoSchema = sceneQcRecordsQuerySchema.transform((data) => ({
  dateFrom: data.date_from,
  dateTo: data.date_to,
  clientId: data.client_id,
  platformId: data.platform_id,
  result: data.result,
  page: data.page,
  limit: data.limit,
}));
export class SceneQcRecordsQueryDto extends createZodDto(sceneQcRecordsQueryDtoSchema) {}

// ============================================================================
// Repository-facing read-model row types
// ============================================================================

export type ReviewRecordRow = {
  id: bigint;
  uid: string;
  operationalDate: Date;
  showUid: string;
  showName: string;
  scheduledStartTime: Date;
  client: { uid: string; name: string } | null;
  platforms: Array<{ uid: string; name: string }>;
  result: PrismaSceneQcResult;
  feedback: string | null;
  reviewedBy: { uid: string; name: string };
  reviewedAt: Date;
  version: number;
  evidenceCount: number;
};

export type ReviewAuditEntry = {
  uid: string;
  action: 'CREATE' | 'UPDATE';
  actor: { uid: string; name: string } | null;
  createdAt: Date;
  oldResult: PrismaSceneQcResult | null;
  newResult: PrismaSceneQcResult | null;
  feedbackChanged: boolean;
};

// ============================================================================
// Read-model -> DTO mappers (camelCase payload -> snake_case API response)
// ============================================================================

export function toSceneQcRecordDto(row: ReviewRecordRow, confirmationRef: ConfirmationRef | undefined): SceneQcRecord {
  const confirmationStatus = !confirmationRef
    ? SCENE_QC_RECORD_CONFIRMATION_STATUS.UNCONFIRMED
    : confirmationRef.isLatestRevisionForDay
      ? SCENE_QC_RECORD_CONFIRMATION_STATUS.CONFIRMED
      : SCENE_QC_RECORD_CONFIRMATION_STATUS.SUPERSEDED;

  return {
    review_id: row.uid,
    operational_date: row.operationalDate.toISOString().slice(0, 10),
    show_id: row.showUid,
    show_name: row.showName,
    scheduled_start_time: row.scheduledStartTime.toISOString(),
    client: row.client ? { id: row.client.uid, name: row.client.name } : null,
    platforms: row.platforms.map((platform) => ({ id: platform.uid, name: platform.name })),
    result: row.result,
    has_feedback: Boolean(row.feedback && row.feedback.trim().length > 0),
    reviewed_by: { id: row.reviewedBy.uid, name: row.reviewedBy.name },
    reviewed_at: row.reviewedAt.toISOString(),
    version: row.version,
    evidence_count: row.evidenceCount,
    confirmation_status: confirmationStatus,
    confirmation_id: confirmationRef?.confirmationUid ?? null,
    confirmation_revision: confirmationRef?.revision ?? null,
  };
}

export function toSceneQcRecordAuditEntryDto(entry: ReviewAuditEntry): SceneQcRecordAuditEntry {
  return {
    id: entry.uid,
    action: entry.action,
    actor: entry.actor ? { id: entry.actor.uid, name: entry.actor.name } : null,
    at: entry.createdAt.toISOString(),
    old_result: entry.oldResult,
    new_result: entry.newResult,
    feedback_changed: entry.feedbackChanged,
  };
}

export function toSceneQcRecordDetailDto(input: {
  show: {
    uid: string;
    name: string;
    scheduledStartTime: Date;
    client: { uid: string; name: string } | null;
    platforms: Array<{ uid: string; name: string }>;
  };
  review: SceneQcReviewRecord;
  confirmation: {
    ref: ConfirmationRef;
    status: SceneQcReportStatus;
    confirmedBy: { uid: string; name: string };
    confirmedAt: Date;
  } | null;
  auditHistory: ReviewAuditEntry[];
}): SceneQcRecordDetail {
  return {
    show: {
      id: input.show.uid,
      name: input.show.name,
      scheduled_start_time: input.show.scheduledStartTime.toISOString(),
      client: input.show.client ? { id: input.show.client.uid, name: input.show.client.name } : null,
      platforms: input.show.platforms.map((platform) => ({ id: platform.uid, name: platform.name })),
    },
    review: {
      id: input.review.uid,
      show_id: input.review.show.uid,
      operational_date: input.review.operationalDate.toISOString().slice(0, 10),
      window_start: input.review.windowStart.toISOString(),
      window_end: input.review.windowEnd.toISOString(),
      timezone: input.review.timezone,
      result: input.review.result,
      feedback: input.review.feedback,
      reviewed_by: { id: input.review.reviewedBy.uid, name: input.review.reviewedBy.name },
      reviewed_at: input.review.reviewedAt.toISOString(),
      expected_reference: input.review.expectedFileUrl
        ? {
            object_key: input.review.expectedObjectKey,
            file_url: input.review.expectedFileUrl,
            scene_type: input.review.expectedSceneType!,
          }
        : null,
      version: input.review.version,
      confirmed_at: input.review.confirmedAt ? input.review.confirmedAt.toISOString() : null,
      created_at: input.review.createdAt.toISOString(),
      updated_at: input.review.updatedAt.toISOString(),
      evidence: input.review.evidence.map((item) => ({
        sort_order: item.sortOrder,
        source_task_id: item.sourceTaskUid,
        source_task_version: item.sourceTaskVersion,
        source_field_key: item.sourceFieldKey,
        label: item.sourceLabel,
        object_key: item.objectKey,
        file_url: item.fileUrl,
      })),
    },
    confirmation: input.confirmation
      ? {
          id: input.confirmation.ref.confirmationUid,
          revision: input.confirmation.ref.revision,
          status: input.confirmation.status,
          confirmed_by: { id: input.confirmation.confirmedBy.uid, name: input.confirmation.confirmedBy.name },
          confirmed_at: input.confirmation.confirmedAt.toISOString(),
        }
      : null,
    audit_history: input.auditHistory.map(toSceneQcRecordAuditEntryDto),
  };
}
