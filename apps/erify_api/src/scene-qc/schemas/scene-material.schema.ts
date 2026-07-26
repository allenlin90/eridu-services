// NOTE: These types CAN use Prisma types to define the payload shape.
// Services import these payload types, NOT Prisma types directly.
import { createZodDto } from 'nestjs-zod';
import z from 'zod';

import {
  createSceneMaterialInputSchema,
  createSceneMaterialRevisionInputSchema,
  sceneMaterialApiResponseSchema,
  sceneMaterialRevisionApiResponseSchema,
  type SceneQcStatus,
  updateSceneMaterialInputSchema,
} from '@eridu/api-types/scene-qc';

import { paginationQuerySchema } from '@/lib/pagination/pagination.schema';
import {
  SCENE_MATERIAL_REVISION_UID_PREFIX,
  SCENE_MATERIAL_UID_PREFIX,
} from '@/scene-qc/scene-qc-uid.util';

// ============================================================================
// Internal entity shapes (DB row -> DTO transform input)
// ============================================================================

export const sceneMaterialRevisionSchema = z.object({
  id: z.bigint(),
  uid: z.string().startsWith(SCENE_MATERIAL_REVISION_UID_PREFIX),
  revision: z.number().int(),
  objectKey: z.string(),
  fileUrl: z.string(),
  mimeType: z.string(),
  fileSize: z.number().int(),
  createdBy: z.object({ uid: z.string() }).nullable(),
  createdAt: z.date(),
});

export const sceneMaterialSchema = z.object({
  id: z.bigint(),
  uid: z.string().startsWith(SCENE_MATERIAL_UID_PREFIX),
  client: z.object({ uid: z.string() }),
  name: z.string(),
  status: z.custom<SceneQcStatus>(),
  version: z.number().int(),
  // Mirrors the Prisma relation name directly (repository selects it ordered
  // desc, take 1) — the response transform below picks `revisions[0]` as
  // `latest_revision`. Keeping the internal shape 1:1 with the `include`
  // avoids a separate service-side reshape step (see `repository-pattern-nestjs`
  // "A New Relation Needs `include` at Every Call Site").
  revisions: z.array(sceneMaterialRevisionSchema),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// ============================================================================
// API input schemas (snake_case input, transform to camelCase payloads)
// ============================================================================

export const createSceneMaterialSchema = createSceneMaterialInputSchema.transform((data) => ({
  name: data.name,
}));

export const updateSceneMaterialSchema = updateSceneMaterialInputSchema.transform((data) => ({
  name: data.name,
  status: data.status,
  version: data.version,
}));

export const createSceneMaterialRevisionSchema = createSceneMaterialRevisionInputSchema.transform(
  (data) => ({
    objectKey: data.object_key,
    fileUrl: data.file_url,
    mimeType: data.mime_type,
    fileSize: data.file_size,
    version: data.version,
  }),
);

// ============================================================================
// Response transforms (camelCase entity -> snake_case API response)
// ============================================================================

function toSceneMaterialRevisionResponse(revision: z.infer<typeof sceneMaterialRevisionSchema>) {
  return {
    id: revision.uid,
    revision: revision.revision,
    object_key: revision.objectKey,
    file_url: revision.fileUrl,
    mime_type: revision.mimeType,
    file_size: revision.fileSize,
    created_by: revision.createdBy?.uid ?? null,
    created_at: revision.createdAt.toISOString(),
  };
}

export const sceneMaterialRevisionDto = sceneMaterialRevisionSchema
  .transform(toSceneMaterialRevisionResponse)
  .pipe(sceneMaterialRevisionApiResponseSchema);

export const sceneMaterialDto = sceneMaterialSchema
  .transform((obj) => ({
    id: obj.uid,
    client_id: obj.client.uid,
    name: obj.name,
    status: obj.status,
    version: obj.version,
    latest_revision: obj.revisions[0] ? toSceneMaterialRevisionResponse(obj.revisions[0]) : null,
    created_at: obj.createdAt.toISOString(),
    updated_at: obj.updatedAt.toISOString(),
  }))
  .pipe(sceneMaterialApiResponseSchema);

// ============================================================================
// DTOs
// ============================================================================

export class CreateSceneMaterialDto extends createZodDto(createSceneMaterialSchema) {}
export class UpdateSceneMaterialDto extends createZodDto(updateSceneMaterialSchema) {}
export class CreateSceneMaterialRevisionDto extends createZodDto(createSceneMaterialRevisionSchema) {}
export class SceneMaterialDto extends createZodDto(sceneMaterialDto) {}
export class SceneMaterialRevisionDto extends createZodDto(sceneMaterialRevisionDto) {}

// List query schema (pagination + client scope/status/search filter).
export const listSceneMaterialsQuerySchema = paginationQuerySchema
  .and(
    z.object({
      client_id: z.string(),
      search: z.string().optional(),
      status: z.custom<SceneQcStatus>().optional(),
    }),
  )
  .transform((data) => ({ ...data, clientUid: data.client_id }));

export class ListSceneMaterialsQueryDto extends createZodDto(listSceneMaterialsQuerySchema) {
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

export type CreateSceneMaterialPayload = {
  name: string;
};

export type UpdateSceneMaterialPayload = {
  name?: string;
  status?: SceneQcStatus;
  version: number;
};

export type CreateSceneMaterialRevisionPayload = {
  objectKey: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
  version: number;
};

export type ListSceneMaterialsParams = {
  clientUid: string;
  search?: string;
  status?: SceneQcStatus;
  includeDeleted?: boolean;
  skip?: number;
  take?: number;
  sort?: 'asc' | 'desc';
};
