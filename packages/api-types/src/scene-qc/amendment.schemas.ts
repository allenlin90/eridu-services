import { z } from 'zod';

import { UID_PREFIXES } from '../constants.js';

import { SCENE_QC_RESULT, sceneQcResultSchema, sceneQcUserRefSchema } from './daily-review.schemas.js';
import { sceneQcFindingInputSchema, sceneQcFindingSchema } from './taxonomy.schemas.js';

export const sceneQcReviewAmendmentSchema = z.object({
  id: z.string().startsWith(UID_PREFIXES.SCENE_QC_AMENDMENT),
  revision: z.number().int().positive(),
  result: sceneQcResultSchema.nullable(),
  note: z.string(),
  findings: z.array(sceneQcFindingSchema),
  created_by: sceneQcUserRefSchema,
  created_at: z.iso.datetime(),
});

export const createSceneQcReviewAmendmentInputSchema = z
  .object({
    note: z.string().trim().min(1).max(2000),
    result: sceneQcResultSchema.nullish(),
    findings: z.array(sceneQcFindingInputSchema).max(50).default([]),
  })
  .superRefine((data, ctx) => {
    if ((data.result === SCENE_QC_RESULT.MINOR || data.result === SCENE_QC_RESULT.FAIL) && data.findings.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['findings'],
        message: 'at least one structured issue is required for Minor and Fail corrections',
      });
    }
    if (data.result === SCENE_QC_RESULT.PASS && data.findings.length > 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['findings'],
        message: 'Pass corrections cannot contain structured issues',
      });
    }
    if (data.result == null && data.findings.length > 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['findings'],
        message: 'comment-only amendments cannot contain structured issues',
      });
    }
  });

export type SceneQcReviewAmendment = z.infer<typeof sceneQcReviewAmendmentSchema>;
export type CreateSceneQcReviewAmendmentInput = z.infer<typeof createSceneQcReviewAmendmentInputSchema>;
