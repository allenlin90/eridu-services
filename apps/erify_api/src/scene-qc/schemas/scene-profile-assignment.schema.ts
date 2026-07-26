// NOTE: These types CAN use Prisma types to define the payload shape.
// Services import these payload types, NOT Prisma types directly.
import { createZodDto } from 'nestjs-zod';
import z from 'zod';

import {
  assignSceneProfileInputSchema,
  resolvedSceneProfileSchema,
  sceneProfileAssignmentApiResponseSchema,
  unassignSceneProfileInputSchema,
} from '@eridu/api-types/scene-qc';

import { SCENE_PROFILE_ASSIGNMENT_UID_PREFIX } from '@/scene-qc/scene-qc-uid.util';

// ============================================================================
// Internal entity shape (DB row -> DTO transform input)
// ============================================================================

export const sceneProfileAssignmentSchema = z.object({
  id: z.bigint(),
  uid: z.string().startsWith(SCENE_PROFILE_ASSIGNMENT_UID_PREFIX),
  show: z.object({ uid: z.string() }),
  profile: z.object({ uid: z.string() }),
  version: z.number().int(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// ============================================================================
// API input schemas (snake_case input, transform to camelCase payloads)
// ============================================================================

export const assignSceneProfileSchema = assignSceneProfileInputSchema.transform((data) => ({
  profileUid: data.profile_id,
  version: data.version,
}));

export const unassignSceneProfileSchema = unassignSceneProfileInputSchema.transform((data) => ({
  version: data.version,
}));

// ============================================================================
// Response transform (camelCase entity -> snake_case API response)
// ============================================================================

export const sceneProfileAssignmentDto = sceneProfileAssignmentSchema
  .transform((obj) => ({
    id: obj.uid,
    show_id: obj.show.uid,
    profile_id: obj.profile.uid,
    version: obj.version,
    created_at: obj.createdAt.toISOString(),
    updated_at: obj.updatedAt.toISOString(),
  }))
  .pipe(sceneProfileAssignmentApiResponseSchema);

// ============================================================================
// DTOs
// ============================================================================

export class AssignSceneProfileDto extends createZodDto(assignSceneProfileSchema) {}
export class UnassignSceneProfileDto extends createZodDto(unassignSceneProfileSchema) {}
export class SceneProfileAssignmentDto extends createZodDto(sceneProfileAssignmentDto) {}

// The resolved-profile read model is already assembled in final snake_case
// shape by `SceneProfileService.resolveProfileForShow` (it composes
// `sceneProfileDto` / `sceneProfileRevisionDto` output, not a raw DB row), so
// this DTO wraps the shared api-types schema directly with no transform.
export class ResolvedSceneProfileDto extends createZodDto(resolvedSceneProfileSchema) {}

// ============================================================================
// Service-layer payload types
// ============================================================================

export type AssignSceneProfilePayload = {
  profileUid: string;
  version?: number;
};

export type UnassignSceneProfilePayload = {
  version: number;
};
