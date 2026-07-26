import { z } from 'zod';

import { sceneProfileResolutionSourceSchema } from './enums.js';
import { sceneProfileApiResponseSchema, sceneProfileRevisionApiResponseSchema } from './scene-profile.schema.js';

/**
 * Scene Profile Assignment API Response Schema (snake_case). An explicit
 * Show -> Profile override; absence falls back to the Client's active
 * default (see `resolvedSceneProfileSchema`).
 */
export const sceneProfileAssignmentApiResponseSchema = z.object({
  id: z.string(),
  show_id: z.string(),
  profile_id: z.string(),
  version: z.number().int(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const assignSceneProfileInputSchema = z.object({
  profile_id: z.string(),
  version: z.number().int().nonnegative().optional(),
});

export const unassignSceneProfileInputSchema = z.object({
  version: z.number().int().nonnegative(),
});

/**
 * The deterministic expected-scene resolution for one Show (assignment,
 * otherwise Client default, otherwise none). `profile` / `revision` are both
 * null when `source` is `NONE` — a missing profile is a warning, not a
 * blocker (see docs/prd/scene-qc.md "Evidence Requirements").
 */
export const resolvedSceneProfileSchema = z.object({
  source: sceneProfileResolutionSourceSchema,
  profile: sceneProfileApiResponseSchema.nullable(),
  revision: sceneProfileRevisionApiResponseSchema.nullable(),
});

export type SceneProfileAssignmentApiResponse = z.infer<typeof sceneProfileAssignmentApiResponseSchema>;
export type AssignSceneProfileInput = z.infer<typeof assignSceneProfileInputSchema>;
export type UnassignSceneProfileInput = z.infer<typeof unassignSceneProfileInputSchema>;
export type ResolvedSceneProfile = z.infer<typeof resolvedSceneProfileSchema>;
