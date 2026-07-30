import { z } from 'zod';

import { UID_PREFIXES } from '../constants.js';
import { createPaginatedResponseSchema, paginationBaseSchema } from '../pagination/schemas.js';

import {
  operationalDateSchema,
  sceneQcClientRefSchema,
  sceneQcPlatformRefSchema,
  sceneQcResultSchema,
  sceneQcReviewSchema,
  sceneQcUserRefSchema,
} from './daily-review.schemas.js';
import { sceneQcReportStatusSchema } from './report.schemas.js';

/**
 * Scene QC Records contracts. See "Routes" in apps/erify_api/docs/SCENE_QC.md.
 * `sceneQcReportStatusSchema` is defined in `report.schemas.ts` and imported
 * here (not duplicated) to avoid a cycle.
 */

export const SCENE_QC_RECORD_CONFIRMATION_STATUS = {
  UNCONFIRMED: 'UNCONFIRMED',
  CONFIRMED: 'CONFIRMED',
  SUPERSEDED: 'SUPERSEDED',
} as const;
export type SceneQcRecordConfirmationStatus =
  (typeof SCENE_QC_RECORD_CONFIRMATION_STATUS)[keyof typeof SCENE_QC_RECORD_CONFIRMATION_STATUS];
export const sceneQcRecordConfirmationStatusSchema = z.enum(
  Object.values(SCENE_QC_RECORD_CONFIRMATION_STATUS) as [
    SceneQcRecordConfirmationStatus,
    ...SceneQcRecordConfirmationStatus[],
  ],
);

/** OQ-29: fail loudly above this span rather than silently truncate. */
export const SCENE_QC_RECORDS_MAX_RANGE_DAYS = 92;

export const sceneQcRecordsQuerySchema = paginationBaseSchema.extend({
  date_from: operationalDateSchema,
  date_to: operationalDateSchema,
  client_id: z.string().startsWith(UID_PREFIXES.CLIENT).optional(),
  platform_id: z.string().startsWith(UID_PREFIXES.PLATFORM).optional(),
  result: sceneQcResultSchema.optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
}).superRefine((data, ctx) => {
  if (data.date_from > data.date_to) {
    ctx.addIssue({ code: 'custom', path: ['date_to'], message: 'date_to must be on or after date_from' });
    return;
  }
  const from = new Date(`${data.date_from}T00:00:00.000Z`);
  const to = new Date(`${data.date_to}T00:00:00.000Z`);
  const spanDays = Math.round((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
  if (spanDays > SCENE_QC_RECORDS_MAX_RANGE_DAYS) {
    ctx.addIssue({
      code: 'custom',
      path: ['date_to'],
      message: `date range cannot exceed ${SCENE_QC_RECORDS_MAX_RANGE_DAYS} days`,
    });
  }
});

export const sceneQcRecordSchema = z.object({
  review_id: z.string().startsWith(UID_PREFIXES.SCENE_QC_REVIEW),
  operational_date: operationalDateSchema,
  show_id: z.string().startsWith(UID_PREFIXES.SHOW),
  show_name: z.string(),
  scheduled_start_time: z.iso.datetime(),
  client: sceneQcClientRefSchema.nullable(),
  platforms: z.array(sceneQcPlatformRefSchema),
  result: sceneQcResultSchema,
  has_feedback: z.boolean(),
  reviewed_by: sceneQcUserRefSchema,
  reviewed_at: z.iso.datetime(),
  version: z.number().int(),
  evidence_count: z.number().int().min(0),
  confirmation_status: sceneQcRecordConfirmationStatusSchema,
  confirmation_id: z.string().startsWith(UID_PREFIXES.SCENE_QC_CONFIRMATION).nullable(),
  confirmation_revision: z.number().int().nullable(),
});

export const sceneQcRecordsResponseSchema = createPaginatedResponseSchema(sceneQcRecordSchema);

/** Curated -- deliberately excludes ip_address, user_agent, and raw metadata. See OQ-18. */
export const sceneQcRecordAuditEntrySchema = z.object({
  id: z.string().startsWith(UID_PREFIXES.AUDIT),
  action: z.enum(['CREATE', 'UPDATE']),
  actor: sceneQcUserRefSchema.nullable(),
  at: z.iso.datetime(),
  old_result: sceneQcResultSchema.nullable(),
  new_result: sceneQcResultSchema.nullable(),
  // Audit metadata stores only `feedback_present: boolean` (the review's
  // feedback text itself is never persisted in audit metadata -- it's a
  // first-class column on the review, see scene-qc-review-workflow.service.ts).
  // So this reflects presence flipping (absent <-> present), not whether the
  // feedback TEXT changed on a save where it was present both before and after.
  feedback_changed: z.boolean(),
});

const sceneQcRecordShowSchema = z.object({
  id: z.string().startsWith(UID_PREFIXES.SHOW),
  name: z.string(),
  scheduled_start_time: z.iso.datetime(),
  client: sceneQcClientRefSchema.nullable(),
  platforms: z.array(sceneQcPlatformRefSchema),
});

export const sceneQcRecordDetailSchema = z.object({
  show: sceneQcRecordShowSchema,
  review: sceneQcReviewSchema,
  confirmation: z.object({
    id: z.string().startsWith(UID_PREFIXES.SCENE_QC_CONFIRMATION),
    revision: z.number().int().positive(),
    status: sceneQcReportStatusSchema,
    confirmed_by: sceneQcUserRefSchema,
    confirmed_at: z.iso.datetime(),
  }).nullable(),
  audit_history: z.array(sceneQcRecordAuditEntrySchema),
});

export type SceneQcRecordsQuery = z.infer<typeof sceneQcRecordsQuerySchema>;
export type SceneQcRecord = z.infer<typeof sceneQcRecordSchema>;
export type SceneQcRecordsResponse = z.infer<typeof sceneQcRecordsResponseSchema>;
export type SceneQcRecordAuditEntry = z.infer<typeof sceneQcRecordAuditEntrySchema>;
export type SceneQcRecordDetail = z.infer<typeof sceneQcRecordDetailSchema>;
