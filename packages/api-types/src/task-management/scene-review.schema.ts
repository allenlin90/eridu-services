import { z } from 'zod';

import { UID_PREFIXES } from '../constants.js';
import { paginationBaseSchema, transformPagination } from '../pagination/index.js';

import { TASK_STATUS, TASK_TYPE } from './task.schema.js';

export const SCENE_REVIEW_MODE = {
  ANALYSIS: 'analysis',
  QC_INBOX: 'qc-inbox',
} as const;

export type SceneReviewMode = (typeof SCENE_REVIEW_MODE)[keyof typeof SCENE_REVIEW_MODE];

const MAX_SCENE_REVIEW_RANGE_MS = 31 * 24 * 60 * 60 * 1000;

export const sceneReviewQuerySchema = paginationBaseSchema
  .extend({
    limit: z.coerce.number().int().min(1).max(50).optional().default(20),
    mode: z.nativeEnum(SCENE_REVIEW_MODE).optional().default(SCENE_REVIEW_MODE.ANALYSIS),
    show_start_from: z.iso.datetime(),
    show_start_to: z.iso.datetime(),
    client_id: z.string().startsWith(`${UID_PREFIXES.CLIENT}_`).optional(),
    platform_id: z.string().startsWith(`${UID_PREFIXES.PLATFORM}_`).optional(),
    search: z.string().trim().min(1).max(100).optional(),
  })
  .superRefine((query, context) => {
    const from = Date.parse(query.show_start_from);
    const to = Date.parse(query.show_start_to);
    if (to < from) {
      context.addIssue({
        code: 'custom',
        message: 'show_start_to must be on or after show_start_from',
        path: ['show_start_to'],
      });
      return;
    }
    if (to - from > MAX_SCENE_REVIEW_RANGE_MS) {
      context.addIssue({
        code: 'custom',
        message: 'Scene Review supports at most 31 operational days',
        path: ['show_start_to'],
      });
    }
  })
  .transform(transformPagination);

export type SceneReviewQuery = z.input<typeof sceneReviewQuerySchema>;
export type SceneReviewQueryTransformed = z.infer<typeof sceneReviewQuerySchema>;

export const sceneReviewEvidenceSchema = z.object({
  key: z.string(),
  label: z.string(),
  url: z.url(),
});

export type SceneReviewEvidence = z.infer<typeof sceneReviewEvidenceSchema>;

export const sceneReviewMetricsSchema = z.object({
  gmv: z.string().optional(),
  viewers: z.string().optional(),
  ctr: z.string().optional(),
  cto: z.string().optional(),
});

export type SceneReviewMetrics = z.infer<typeof sceneReviewMetricsSchema>;

const sceneReviewShowSchema = z.object({
  id: z.string().startsWith(`${UID_PREFIXES.SHOW}_`),
  name: z.string(),
  start_time: z.iso.datetime(),
});

const sceneReviewClientSchema = z.object({
  id: z.string().startsWith(`${UID_PREFIXES.CLIENT}_`),
  name: z.string(),
});

const sceneReviewPlatformSchema = z.object({
  id: z.string().startsWith(`${UID_PREFIXES.PLATFORM}_`),
  name: z.string(),
});

const sceneReviewItemBaseSchema = z.object({
  task_id: z.string().startsWith(`${UID_PREFIXES.TASK}_`),
  task_type: z.nativeEnum(TASK_TYPE),
  status: z.nativeEnum(TASK_STATUS),
  submitted_at: z.iso.datetime().nullable(),
  activity_at: z.iso.datetime(),
  show: sceneReviewShowSchema,
  client: sceneReviewClientSchema.nullable(),
  platforms: z.array(sceneReviewPlatformSchema),
  metrics: sceneReviewMetricsSchema,
});

export const sceneReviewListItemSchema = sceneReviewItemBaseSchema.extend({
  preview: sceneReviewEvidenceSchema,
  evidence_count: z.number().int().positive(),
  evidence_labels: z.array(z.string()),
  reference_available: z.literal(false),
});

export type SceneReviewListItem = z.infer<typeof sceneReviewListItemSchema>;

export const sceneReviewDetailSchema = sceneReviewItemBaseSchema.extend({
  evidence: z.array(sceneReviewEvidenceSchema).min(1),
  schema: z.unknown().nullable(),
  content: z.record(z.string(), z.unknown()).nullable(),
  hydration_context: z.object({
    creators: z.array(z.object({ uid: z.string(), label: z.string() })),
    platforms: z.array(z.object({ uid: z.string(), label: z.string() })),
  }),
  reference: z.null(),
});

export type SceneReviewDetail = z.infer<typeof sceneReviewDetailSchema>;
