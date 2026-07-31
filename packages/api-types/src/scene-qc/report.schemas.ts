import { z } from 'zod';

import { UID_PREFIXES } from '../constants.js';

import {
  operationalDateSchema,
  sceneQcClientRefSchema,
  sceneQcPlatformRefSchema,
  sceneQcResultSchema,
  sceneQcUserRefSchema,
} from './daily-review.schemas.js';
import { sceneTypeSchema } from './schemas.js';

/**
 * Scene QC Manager Report contracts. See "Routes" and "Persisted Model" in
 * apps/erify_api/docs/SCENE_QC.md.
 *
 * The daily summary state (`SCENE_QC_CONFIRMATION_STATE`, a property of the
 * DAY) and the report status below (a property of a REVISION) are
 * deliberately separate enums -- see OQ-41. Do not merge them.
 */

export const SCENE_QC_REPORT_STATUS = { CURRENT: 'CURRENT', STALE: 'STALE', SUPERSEDED: 'SUPERSEDED' } as const;
export type SceneQcReportStatus = (typeof SCENE_QC_REPORT_STATUS)[keyof typeof SCENE_QC_REPORT_STATUS];
export const sceneQcReportStatusSchema = z.enum(
  Object.values(SCENE_QC_REPORT_STATUS) as [SceneQcReportStatus, ...SceneQcReportStatus[]],
);

const sceneQcReportBreakdownRowSchema = z.object({
  pass_count: z.number().int().min(0),
  minor_count: z.number().int().min(0),
  fail_count: z.number().int().min(0),
  total_count: z.number().int().min(0),
});

export const sceneQcReportClientBreakdownSchema = sceneQcReportBreakdownRowSchema.extend({
  client_id: z.string().startsWith(UID_PREFIXES.CLIENT),
  client_name: z.string(),
});

export const sceneQcReportPlatformBreakdownSchema = sceneQcReportBreakdownRowSchema.extend({
  platform_id: z.string().startsWith(UID_PREFIXES.PLATFORM),
  platform_name: z.string(),
});

export const sceneQcReportShowSchema = z.object({
  scheduled_start_time: z.iso.datetime(),
  show_id: z.string().startsWith(UID_PREFIXES.SHOW),
  show_name: z.string(),
  client: sceneQcClientRefSchema.nullable(),
  platforms: z.array(sceneQcPlatformRefSchema),
  result: sceneQcResultSchema,
  reviewed_by: sceneQcUserRefSchema,
  reviewed_at: z.iso.datetime(),
  feedback: z.string().nullable(),
  evidence_count: z.number().int().min(0),
  scene_type: sceneTypeSchema.nullable(),
  // Always `false` in Stage 1 -- the field exists now so Stage 2 amendment
  // support is additive (OQ-31).
  amended: z.boolean(),
});

export const sceneQcReportSchema = z.object({
  confirmation_id: z.string().startsWith(UID_PREFIXES.SCENE_QC_CONFIRMATION),
  confirmation_revision: z.number().int().positive(),
  status: sceneQcReportStatusSchema,
  studio: z.object({ id: z.string().startsWith(UID_PREFIXES.STUDIO), name: z.string() }),
  operational_date: operationalDateSchema,
  window_start: z.iso.datetime(),
  window_end: z.iso.datetime(),
  timezone: z.string().min(1),
  confirmed_by: sceneQcUserRefSchema,
  confirmed_at: z.iso.datetime(),
  generated_at: z.iso.datetime(),

  scope: z.object({
    total_shows: z.number().int().min(0),
    pass_count: z.number().int().min(0),
    minor_count: z.number().int().min(0),
    fail_count: z.number().int().min(0),
    pass_percentage: z.number(),
    minor_percentage: z.number(),
    fail_percentage: z.number(),
  }),

  client_breakdown: z.array(sceneQcReportClientBreakdownSchema),
  platform_breakdown: z.array(sceneQcReportPlatformBreakdownSchema),

  shows: z.array(sceneQcReportShowSchema),
  exceptions: z.array(sceneQcReportShowSchema),
});

/** The EXACT ordered §6.3 CSV column list. Single source shared by the server serializer. */
export const SCENE_QC_REPORT_CSV_COLUMNS = [
  'studio',
  'operational_date',
  'timezone',
  'confirmation_revision',
  'confirmed_by',
  'confirmed_at',
  'show_start_time',
  'show_id',
  'show_name',
  'client_id',
  'client_name',
  'platforms',
  'result',
  'feedback',
  'reviewed_by',
  'reviewed_at',
  'evidence_count',
  'scene_type',
  'amended',
] as const;

export type SceneQcReportShow = z.infer<typeof sceneQcReportShowSchema>;
export type SceneQcReportClientBreakdown = z.infer<typeof sceneQcReportClientBreakdownSchema>;
export type SceneQcReportPlatformBreakdown = z.infer<typeof sceneQcReportPlatformBreakdownSchema>;
export type SceneQcReport = z.infer<typeof sceneQcReportSchema>;
