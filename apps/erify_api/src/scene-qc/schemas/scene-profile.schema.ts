// NOTE: These types CAN use Prisma types to define the payload shape.
// Services import these payload types, NOT Prisma types directly.
import { createZodDto } from 'nestjs-zod';
import z from 'zod';

import {
  createSceneProfileInputSchema,
  createSceneProfileRevisionInputSchema,
  sceneProfileApiResponseSchema,
  sceneProfileRevisionApiResponseSchema,
  sceneProfileRevisionMaterialApiResponseSchema,
  type SceneQcStatus,
  type SceneType,
  updateSceneProfileInputSchema,
} from '@eridu/api-types/scene-qc';

import { paginationQuerySchema } from '@/lib/pagination/pagination.schema';
import {
  SCENE_PROFILE_REVISION_UID_PREFIX,
  SCENE_PROFILE_UID_PREFIX,
} from '@/scene-qc/scene-qc-uid.util';

// ============================================================================
// Internal entity shapes (DB row -> DTO transform input)
// ============================================================================

export const sceneProfileRevisionMaterialSchema = z.object({
  label: z.string(),
  sortOrder: z.number().int(),
  studio: z.object({ uid: z.string() }).nullable(),
  platform: z.object({ uid: z.string() }).nullable(),
  materialRevision: z.object({
    uid: z.string(),
    revision: z.number().int(),
    objectKey: z.string(),
    fileUrl: z.string(),
    mimeType: z.string(),
    material: z.object({ uid: z.string() }),
  }),
});

export const sceneProfileRevisionSchema = z.object({
  id: z.bigint(),
  uid: z.string().startsWith(SCENE_PROFILE_REVISION_UID_PREFIX),
  revision: z.number().int(),
  profileName: z.string(),
  profileDescription: z.string().nullable(),
  sceneType: z.custom<SceneType>(),
  materials: z.array(sceneProfileRevisionMaterialSchema),
  createdBy: z.object({ uid: z.string() }).nullable(),
  createdAt: z.date(),
});

export const sceneProfileSchema = z.object({
  id: z.bigint(),
  uid: z.string().startsWith(SCENE_PROFILE_UID_PREFIX),
  client: z.object({ uid: z.string() }),
  name: z.string(),
  description: z.string().nullable(),
  status: z.custom<SceneQcStatus>(),
  isDefault: z.boolean(),
  sceneType: z.custom<SceneType>(),
  version: z.number().int(),
  // Mirrors the Prisma relation name directly (repository selects it ordered
  // desc, take 1) — the response transform picks `revisions[0]` as
  // `current_revision`. See the matching note on `sceneMaterialSchema`.
  revisions: z.array(sceneProfileRevisionSchema),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// ============================================================================
// API input schemas (snake_case input, transform to camelCase payloads)
// ============================================================================

export const createSceneProfileSchema = createSceneProfileInputSchema.transform((data) => ({
  name: data.name,
  description: data.description,
  sceneType: data.scene_type,
}));

export const updateSceneProfileSchema = updateSceneProfileInputSchema.transform((data) => ({
  name: data.name,
  description: data.description,
  sceneType: data.scene_type,
  status: data.status,
  isDefault: data.is_default,
  version: data.version,
}));

// Array position is the stable `sort_order` — see
// `sceneProfileRevisionMaterialInputSchema` in @eridu/api-types/scene-qc.
export const createSceneProfileRevisionSchema = createSceneProfileRevisionInputSchema.transform(
  (data) => ({
    materials: data.materials.map((material, index) => ({
      materialRevisionUid: material.material_revision_id,
      label: material.label,
      studioUid: material.studio_id,
      platformUid: material.platform_id,
      sortOrder: index,
    })),
    version: data.version,
  }),
);

// ============================================================================
// Response transforms (camelCase entity -> snake_case API response)
// ============================================================================

function toSceneProfileRevisionMaterialResponse(
  link: z.infer<typeof sceneProfileRevisionMaterialSchema>,
) {
  return {
    material_id: link.materialRevision.material.uid,
    material_revision_id: link.materialRevision.uid,
    revision: link.materialRevision.revision,
    label: link.label,
    sort_order: link.sortOrder,
    studio_id: link.studio?.uid ?? null,
    platform_id: link.platform?.uid ?? null,
    object_key: link.materialRevision.objectKey,
    file_url: link.materialRevision.fileUrl,
    mime_type: link.materialRevision.mimeType,
  };
}

function toSceneProfileRevisionResponse(revision: z.infer<typeof sceneProfileRevisionSchema>) {
  return {
    id: revision.uid,
    revision: revision.revision,
    profile_name: revision.profileName,
    profile_description: revision.profileDescription,
    scene_type: revision.sceneType,
    materials: revision.materials.map(toSceneProfileRevisionMaterialResponse),
    created_by: revision.createdBy?.uid ?? null,
    created_at: revision.createdAt.toISOString(),
  };
}

export const sceneProfileRevisionMaterialDto = sceneProfileRevisionMaterialSchema
  .transform(toSceneProfileRevisionMaterialResponse)
  .pipe(sceneProfileRevisionMaterialApiResponseSchema);

export const sceneProfileRevisionDto = sceneProfileRevisionSchema
  .transform(toSceneProfileRevisionResponse)
  .pipe(sceneProfileRevisionApiResponseSchema);

export const sceneProfileDto = sceneProfileSchema
  .transform((obj) => ({
    id: obj.uid,
    client_id: obj.client.uid,
    name: obj.name,
    description: obj.description,
    status: obj.status,
    is_default: obj.isDefault,
    scene_type: obj.sceneType,
    version: obj.version,
    current_revision: obj.revisions[0] ? toSceneProfileRevisionResponse(obj.revisions[0]) : null,
    created_at: obj.createdAt.toISOString(),
    updated_at: obj.updatedAt.toISOString(),
  }))
  .pipe(sceneProfileApiResponseSchema);

// ============================================================================
// DTOs
// ============================================================================

export class CreateSceneProfileDto extends createZodDto(createSceneProfileSchema) {}
export class UpdateSceneProfileDto extends createZodDto(updateSceneProfileSchema) {}
export class CreateSceneProfileRevisionDto extends createZodDto(createSceneProfileRevisionSchema) {}
export class SceneProfileDto extends createZodDto(sceneProfileDto) {}
export class SceneProfileRevisionDto extends createZodDto(sceneProfileRevisionDto) {}

// List query schema (pagination + client scope/status/search filter).
export const listSceneProfilesQuerySchema = paginationQuerySchema
  .and(
    z.object({
      client_id: z.string(),
      search: z.string().optional(),
      status: z.custom<SceneQcStatus>().optional(),
    }),
  )
  .transform((data) => ({ ...data, clientUid: data.client_id }));

export class ListSceneProfilesQueryDto extends createZodDto(listSceneProfilesQuerySchema) {
  declare page: number;
  declare limit: number;
  declare take: number;
  declare skip: number;
  declare sort: 'asc' | 'desc';
  declare client_id: string;
  declare clientUid: string;
  declare search: string | undefined;
  declare status: SceneQcStatus | undefined;
}

// ============================================================================
// Service-layer payload types
// ============================================================================

export type CreateSceneProfilePayload = {
  name: string;
  description?: string;
  sceneType: SceneType;
};

export type UpdateSceneProfilePayload = {
  name?: string;
  description?: string;
  sceneType?: SceneType;
  status?: SceneQcStatus;
  isDefault?: boolean;
  version: number;
};

export type SceneProfileRevisionMaterialInputPayload = {
  materialRevisionUid: string;
  label?: string;
  studioUid?: string;
  platformUid?: string;
  sortOrder: number;
};

export type SaveSceneProfileCompositionPayload = {
  materials: SceneProfileRevisionMaterialInputPayload[];
  version: number;
};

export type ListSceneProfilesParams = {
  clientUid: string;
  search?: string;
  status?: SceneQcStatus;
  includeDeleted?: boolean;
  skip?: number;
  take?: number;
  sort?: 'asc' | 'desc';
};
