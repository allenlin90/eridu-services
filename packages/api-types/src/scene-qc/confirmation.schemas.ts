import { z } from 'zod';

import { UID_PREFIXES } from '../constants.js';

import { operationalDateSchema, sceneQcOperationalWindowSchema, sceneQcUserRefSchema } from './daily-review.schemas.js';

/**
 * Scene QC Daily Confirmation contracts. See "Persisted Model" in
 * apps/erify_api/docs/SCENE_QC.md.
 */

export const createSceneQcConfirmationInputSchema = z.object({
  operational_date: operationalDateSchema,
});

/**
 * The command body carries ONLY `operational_date`. No `expected_revision` /
 * idempotency token: the advisory lock plus the CURRENT-state replay guard
 * (OQ-19) make one redundant, and accepting a client-supplied revision would
 * invite a client to re-anchor lineage.
 */
export const sceneQcConfirmationSchema = sceneQcOperationalWindowSchema.extend({
  id: z.string().startsWith(UID_PREFIXES.SCENE_QC_CONFIRMATION),
  revision: z.number().int().positive(),
  confirmed_by: sceneQcUserRefSchema,
  confirmed_at: z.iso.datetime(),
  show_count: z.number().int().min(0),
  pass_count: z.number().int().min(0),
  minor_count: z.number().int().min(0),
  fail_count: z.number().int().min(0),
});

export type CreateSceneQcConfirmationInput = z.infer<typeof createSceneQcConfirmationInputSchema>;
export type SceneQcConfirmation = z.infer<typeof sceneQcConfirmationSchema>;
