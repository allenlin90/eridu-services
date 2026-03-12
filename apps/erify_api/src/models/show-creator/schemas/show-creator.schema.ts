// ============================================================================
// Service Layer Payload Types
// ============================================================================
// NOTE: These types CAN use Prisma types to define the payload shape.
// Services import these payload types, NOT Prisma types directly.
import { createZodDto } from 'nestjs-zod';
import z from 'zod';

import { isCreatorUid } from '@/models/creator/creator-uid.util';
import { creatorSchema } from '@/models/creator/schemas/creator.schema';
import { showSchema } from '@/models/show/schemas/show.schema';
import { ShowService } from '@/models/show/show.service';
import { ShowCreatorService } from '@/models/show-creator/show-creator.service';

// Internal schema for database entity
export const showCreatorSchema = z.object({
  id: z.bigint(),
  uid: z.string().startsWith(ShowCreatorService.UID_PREFIX),
  showId: z.bigint(),
  creatorId: z.bigint(),
  note: z.string().nullable(),
  metadata: z.record(z.string(), z.any()),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
});

// API input schema (snake_case input, transforms to camelCase)
export const createShowCreatorSchema = z.object({
  show_id: z.string().startsWith(ShowService.UID_PREFIX), // UID
  creator_id: z.string().refine(isCreatorUid, 'Invalid creator UID'), // UID
  note: z.string().max(1000).optional(), // Add max length for notes
  metadata: z.record(z.string(), z.any()).optional(),
});

const transformCreateShowCreatorSchema = createShowCreatorSchema.transform((data) => ({
  showId: data.show_id,
  creatorId: data.creator_id,
  note: data.note,
  metadata: data.metadata,
}));

// API update schema (snake_case input, transforms to camelCase)
export const updateShowCreatorSchema = z
  .object({
    show_id: z.string().startsWith(ShowService.UID_PREFIX).optional(), // UID
    creator_id: z.string().refine(isCreatorUid, 'Invalid creator UID').optional(), // UID
    note: z.string().max(1000).nullable().optional(), // Add max length for notes
    metadata: z.record(z.string(), z.any()).optional(),
  })
  .transform((data) => ({
    showId: data.show_id,
    creatorId: data.creator_id,
    note: data.note,
    metadata: data.metadata,
  }));

// Schema for ShowCreator with relations (used in admin endpoints)
export const showCreatorWithRelationsSchema = showCreatorSchema.extend({
  show: showSchema.optional(),
  creator: creatorSchema.optional(),
});

// API output schema (transforms to snake_case)
export const showCreatorDto = showCreatorWithRelationsSchema
  .transform((obj) => ({
    id: obj.uid,
    show_id: obj.show?.uid ?? null,
    show_name: obj.show?.name ?? null,
    creator_id: obj.creator?.uid ?? null,
    creator_name: obj.creator?.name ?? null,
    creator_alias_name: obj.creator?.aliasName ?? null,
    note: obj.note,
    metadata: obj.metadata,
    created_at: obj.createdAt.toISOString(),
    updated_at: obj.updatedAt.toISOString(),
  }))
  .pipe(
    z.object({
      id: z.string(),
      show_id: z.string().nullable(),
      show_name: z.string().nullable(),
      creator_id: z.string().nullable(),
      creator_name: z.string().nullable(),
      creator_alias_name: z.string().nullable(),
      note: z.string().nullable(),
      metadata: z.record(z.string(), z.any()),
      created_at: z.iso.datetime(),
      updated_at: z.iso.datetime(),
    }),
  );

// DTOs for input/output
export class CreateShowCreatorDto extends createZodDto(
  transformCreateShowCreatorSchema,
) {}
export class UpdateShowCreatorDto extends createZodDto(updateShowCreatorSchema) {}
export class ShowCreatorDto extends createZodDto(showCreatorDto) {}

/**
 * Payload for creating a show Creator (service layer).
 */
export type CreateShowCreatorPayload = {
  showId: string;
  creatorId: string;
  note?: string | null;
  metadata?: Record<string, any>;
};

/**
 * Payload for updating a show Creator (service layer).
 */
export type UpdateShowCreatorPayload = {
  showId?: string;
  creatorId?: string;
  note?: string | null;
  metadata?: Record<string, any>;
};

/**
 * Type-safe filter options for show creators.
 */
export type ShowCreatorFilters = {
  uid?: string;
  showId?: bigint;
  creatorId?: bigint;
  show?: { uid: string };
  creator?: { uid: string };
  deletedAt?: Date | null;
};

/**
 * Type-safe order by options for show creators.
 */
export type ShowCreatorOrderBy = {
  createdAt?: 'asc' | 'desc';
  updatedAt?: 'asc' | 'desc';
};
