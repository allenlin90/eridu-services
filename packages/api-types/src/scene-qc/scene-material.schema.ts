import { z } from 'zod';

import { createPaginatedResponseSchema } from '../pagination/schemas.js';

import { SCENE_MATERIAL_ALLOWED_MIME_TYPES } from './constants.js';
import { sceneQcStatusSchema } from './enums.js';

const sceneMaterialAllowedMimeTypes = SCENE_MATERIAL_ALLOWED_MIME_TYPES as [string, ...string[]];

/**
 * Scene Material Revision API Response Schema (snake_case). Immutable
 * uploaded image version — `object_key` is the durable render source;
 * `file_url` is the upload-time locator only.
 */
export const sceneMaterialRevisionApiResponseSchema = z.object({
  id: z.string(),
  revision: z.number().int(),
  object_key: z.string(),
  file_url: z.string(),
  mime_type: z.string(),
  file_size: z.number().int(),
  created_by: z.string().nullable(),
  created_at: z.string(),
});

/**
 * Scene Material API Response Schema (snake_case). `latest_revision` is null
 * only for a material that has never had an image uploaded.
 */
export const sceneMaterialApiResponseSchema = z.object({
  id: z.string(),
  client_id: z.string(),
  name: z.string(),
  status: sceneQcStatusSchema,
  version: z.number().int(),
  latest_revision: sceneMaterialRevisionApiResponseSchema.nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const createSceneMaterialInputSchema = z.object({
  name: z.string().min(1, 'Name is required'),
});

export const updateSceneMaterialInputSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  status: sceneQcStatusSchema.optional(),
  version: z.number().int().nonnegative(),
});

export const createSceneMaterialRevisionInputSchema = z.object({
  object_key: z.string().min(1),
  file_url: z.url(),
  mime_type: z.enum(sceneMaterialAllowedMimeTypes),
  file_size: z.number().int().positive(),
  version: z.number().int().nonnegative(),
});

export const listSceneMaterialsFilterSchema = z.object({
  client_id: z.string(),
  search: z.string().optional(),
  status: sceneQcStatusSchema.optional(),
});

export const paginatedSceneMaterialsResponseSchema = createPaginatedResponseSchema(
  sceneMaterialApiResponseSchema,
);

export type SceneMaterialRevisionApiResponse = z.infer<typeof sceneMaterialRevisionApiResponseSchema>;
export type SceneMaterialApiResponse = z.infer<typeof sceneMaterialApiResponseSchema>;
export type CreateSceneMaterialInput = z.infer<typeof createSceneMaterialInputSchema>;
export type UpdateSceneMaterialInput = z.infer<typeof updateSceneMaterialInputSchema>;
export type CreateSceneMaterialRevisionInput = z.infer<typeof createSceneMaterialRevisionInputSchema>;
export type ListSceneMaterialsFilter = z.infer<typeof listSceneMaterialsFilterSchema>;
export type PaginatedSceneMaterialsResponse = z.infer<typeof paginatedSceneMaterialsResponseSchema>;
