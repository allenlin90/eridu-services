// ============================================================================
// Service Layer Payload Types
// ============================================================================
// NOTE: These types CAN use Prisma types to define the payload shape.
// Services import these payload types, NOT Prisma types directly.
import type { Prisma, SceneProfile, SceneType } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import z from 'zod';

import { UID_PREFIXES } from '@eridu/api-types/constants';
import {
  saveSceneProfileInputSchema,
  sceneProfileApiResponseSchema,
  sceneTypeSchema,
} from '@eridu/api-types/scene-qc';

import { ClientService } from '@/models/client/client.service';

/**
 * Every persistence read/write MUST apply this include — the DTO derives
 * `client_id` from the included relation, never from the internal `clientId`
 * FK, so an omitted include produces a Zod parse failure instead of a silent
 * `undefined`.
 */
export const sceneProfileDefaultInclude = {
  client: { select: { uid: true } },
} as const satisfies Prisma.SceneProfileInclude;

// Internal entity shape (DB row -> DTO transform input).
export const sceneProfileSchema = z.object({
  id: z.bigint(),
  uid: z.string().startsWith(UID_PREFIXES.SCENE_PROFILE),
  client: z.object({ uid: z.string().startsWith(ClientService.UID_PREFIX) }),
  objectKey: z.string(),
  fileUrl: z.string(),
  mimeType: z.string(),
  fileSize: z.number().int(),
  sceneType: sceneTypeSchema,
  version: z.number().int(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
});

export const sceneProfileDto = sceneProfileSchema
  .transform((obj) => ({
    id: obj.uid,
    client_id: obj.client.uid,
    object_key: obj.objectKey,
    file_url: obj.fileUrl,
    mime_type: obj.mimeType,
    file_size: obj.fileSize,
    scene_type: obj.sceneType,
    version: obj.version,
    created_at: obj.createdAt.toISOString(),
    updated_at: obj.updatedAt.toISOString(),
  }))
  .pipe(sceneProfileApiResponseSchema);

// API input schema (snake_case input, transforms to camelCase payload).
export const saveSceneProfileSchema = saveSceneProfileInputSchema.transform((data) => ({
  objectKey: data.object_key,
  fileUrl: data.file_url,
  mimeType: data.mime_type,
  fileSize: data.file_size,
  sceneType: data.scene_type,
  version: data.version,
}));

// DTOs for input/output.
export class SaveSceneProfileDto extends createZodDto(saveSceneProfileSchema) {}
export class SceneProfileDto extends createZodDto(sceneProfileDto) {}

// Required (not optional): an omitted version would make retire last-writer-
// wins with no stale-write protection at all, unlike the create-or-replace
// PUT where omission has a real meaning ("I believe there is no profile").
// There is no such alternate meaning for DELETE, so there is no fallback to
// preserve.
export const retireSceneProfileQuerySchema = z.object({
  version: z.coerce.number().int().positive(),
});
export class RetireSceneProfileQueryDto extends createZodDto(retireSceneProfileQuerySchema) {}

/** Request-derived context every Scene Profile mutation needs for audit provenance. */
export type SceneProfileMutationContext = { actorExtId: string; studioUid: string };

/**
 * Payload for creating or replacing a Client's Scene Profile (service layer).
 * `version` omitted means "create"; `version` present means "replace at
 * exactly this version". See `SceneProfileService.saveProfileForClient`.
 */
export type SaveSceneProfilePayload = {
  objectKey: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
  sceneType: SceneType;
  version?: number;
};

/**
 * Persisted Scene Profile row with the included Client relation every
 * read/write path must select.
 */
export type SceneProfileRecord = SceneProfile & { client: { uid: string } };
