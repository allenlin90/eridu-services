import { z } from 'zod';

import { UID_PREFIXES } from '../constants.js';
import { FILE_UPLOAD_USE_CASE, getUploadMaxFileSizeBytes } from '../uploads/schemas.js';

/**
 * A Client's declared physical scene setup for its Scene Profile reference
 * image. Required on every Scene Profile — see
 * `apps/erify_api/docs/design/SCENE_QC_IMPLEMENTATION_PLAN.md` section 5.1.
 */
export const SCENE_TYPE = {
  GRAPHIC_BG: 'GRAPHIC_BG',
  REAL_BACKDROP: 'REAL_BACKDROP',
} as const;

export type SceneType = (typeof SCENE_TYPE)[keyof typeof SCENE_TYPE];

export const sceneTypeSchema = z.enum(Object.values(SCENE_TYPE) as [SceneType, ...SceneType[]]);

/**
 * Stage 1 accepts image types only, narrower than the shared `SCENE_REFERENCE`
 * upload use case, which also allows `application/pdf`.
 */
export const SCENE_PROFILE_ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export const sceneProfileMimeTypeSchema = z.enum(SCENE_PROFILE_ALLOWED_MIME_TYPES);

/**
 * Reuses the `SCENE_REFERENCE` upload use case's ceiling rather than
 * duplicating a literal byte count.
 */
export const SCENE_PROFILE_MAX_FILE_SIZE_BYTES = getUploadMaxFileSizeBytes(
  FILE_UPLOAD_USE_CASE.SCENE_REFERENCE,
);

/**
 * Scene Profile API Response Schema (snake_case — matches backend API output).
 *
 * A Scene Profile is a Client's single mutable expected-scene reference image.
 * `version` is the optimistic-lock token for concurrent replace/retire calls.
 */
export const sceneProfileApiResponseSchema = z.object({
  id: z.string().startsWith(UID_PREFIXES.SCENE_PROFILE),
  client_id: z.string().startsWith(UID_PREFIXES.CLIENT),
  object_key: z.string().min(1),
  file_url: z.string().min(1),
  mime_type: sceneProfileMimeTypeSchema,
  file_size: z.number().int().positive(),
  scene_type: sceneTypeSchema,
  version: z.number().int(),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
});

/**
 * Create-or-replace input for `PUT /studios/:studioId/scene-profiles/:clientId`.
 *
 * There is no separate create/update contract and no revision sub-resource:
 * `version` omitted means "I believe this Client has no profile" (create);
 * `version` present means "I am replacing at exactly this version" (replace).
 */
export const saveSceneProfileInputSchema = z.object({
  object_key: z.string().min(1),
  file_url: z.url(),
  mime_type: sceneProfileMimeTypeSchema,
  file_size: z.number().int().positive().max(SCENE_PROFILE_MAX_FILE_SIZE_BYTES),
  scene_type: sceneTypeSchema,
  version: z.number().int().nonnegative().optional(),
});

export type SceneProfileApiResponse = z.infer<typeof sceneProfileApiResponseSchema>;
export type SaveSceneProfileInput = z.infer<typeof saveSceneProfileInputSchema>;
