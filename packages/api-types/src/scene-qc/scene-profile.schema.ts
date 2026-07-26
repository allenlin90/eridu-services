import { z } from 'zod';

import { createPaginatedResponseSchema } from '../pagination/schemas.js';

import { sceneQcStatusSchema, sceneTypeSchema } from './enums.js';

/**
 * One resolved ordered expected-reference gallery entry (snake_case). Read
 * model only — the write path is `SceneProfileRevisionMaterial` plus the
 * exact `SceneMaterialRevision` it pins.
 */
export const sceneProfileRevisionMaterialApiResponseSchema = z.object({
  material_id: z.string(),
  material_revision_id: z.string(),
  revision: z.number().int(),
  label: z.string(),
  sort_order: z.number().int(),
  studio_id: z.string().nullable(),
  platform_id: z.string().nullable(),
  object_key: z.string(),
  file_url: z.string(),
  mime_type: z.string(),
});

/**
 * Scene Profile Revision API Response Schema (snake_case). Immutable
 * composition revision — `profile_name` / `profile_description` /
 * `scene_type` are confirmation-safe display snapshots, not live lookups.
 */
export const sceneProfileRevisionApiResponseSchema = z.object({
  id: z.string(),
  revision: z.number().int(),
  profile_name: z.string(),
  profile_description: z.string().nullable(),
  scene_type: sceneTypeSchema,
  materials: z.array(sceneProfileRevisionMaterialApiResponseSchema),
  created_by: z.string().nullable(),
  created_at: z.string(),
});

/**
 * Scene Profile API Response Schema (snake_case). `current_revision` is null
 * for a profile whose composition has never been saved.
 */
export const sceneProfileApiResponseSchema = z.object({
  id: z.string(),
  client_id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  status: sceneQcStatusSchema,
  is_default: z.boolean(),
  scene_type: sceneTypeSchema,
  version: z.number().int(),
  current_revision: sceneProfileRevisionApiResponseSchema.nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const createSceneProfileInputSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  scene_type: sceneTypeSchema,
});

export const updateSceneProfileInputSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  description: z.string().optional(),
  scene_type: sceneTypeSchema.optional(),
  status: sceneQcStatusSchema.optional(),
  is_default: z.boolean().optional(),
  version: z.number().int().nonnegative(),
});

/**
 * One ordered expected-reference gallery entry supplied on composition save.
 * Array position in `createSceneProfileRevisionInputSchema.materials` is the
 * stable `sort_order` — there is no separate input field for it.
 */
export const sceneProfileRevisionMaterialInputSchema = z.object({
  material_revision_id: z.string(),
  label: z.string().min(1).optional(),
  studio_id: z.string().optional(),
  platform_id: z.string().optional(),
});

export const createSceneProfileRevisionInputSchema = z.object({
  materials: z.array(sceneProfileRevisionMaterialInputSchema).min(1),
  version: z.number().int().nonnegative(),
});

export const listSceneProfilesFilterSchema = z.object({
  client_id: z.string(),
  search: z.string().optional(),
  status: sceneQcStatusSchema.optional(),
});

export const paginatedSceneProfilesResponseSchema = createPaginatedResponseSchema(
  sceneProfileApiResponseSchema,
);

export type SceneProfileRevisionMaterialApiResponse = z.infer<
  typeof sceneProfileRevisionMaterialApiResponseSchema
>;
export type SceneProfileRevisionApiResponse = z.infer<typeof sceneProfileRevisionApiResponseSchema>;
export type SceneProfileApiResponse = z.infer<typeof sceneProfileApiResponseSchema>;
export type CreateSceneProfileInput = z.infer<typeof createSceneProfileInputSchema>;
export type UpdateSceneProfileInput = z.infer<typeof updateSceneProfileInputSchema>;
export type SceneProfileRevisionMaterialInput = z.infer<typeof sceneProfileRevisionMaterialInputSchema>;
export type CreateSceneProfileRevisionInput = z.infer<typeof createSceneProfileRevisionInputSchema>;
export type ListSceneProfilesFilter = z.infer<typeof listSceneProfilesFilterSchema>;
export type PaginatedSceneProfilesResponse = z.infer<typeof paginatedSceneProfilesResponseSchema>;
