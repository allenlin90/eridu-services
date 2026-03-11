// ============================================================================
// Service Layer Payload Types
// ============================================================================
// NOTE: These types CAN use Prisma types to define the payload shape.
// Services import these payload types, NOT Prisma types directly.
import { createZodDto } from 'nestjs-zod';
import z from 'zod';

import { isCreatorUid } from '@/models/creator/creator-uid.util';
import { mcSchema } from '@/models/mc/schemas/mc.schema';
import { showSchema } from '@/models/show/schemas/show.schema';
import { ShowService } from '@/models/show/show.service';
import { ShowMcService } from '@/models/show-mc/show-mc.service';

// Internal schema for database entity
export const showMcSchema = z.object({
  id: z.bigint(),
  uid: z.string().startsWith(ShowMcService.UID_PREFIX),
  showId: z.bigint(),
  mcId: z.bigint(),
  note: z.string().nullable(),
  metadata: z.record(z.string(), z.any()),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
});

// API input schema (snake_case input, transforms to camelCase)
export const createShowMcSchema = z.object({
  show_id: z.string().startsWith(ShowService.UID_PREFIX), // UID
  mc_id: z.string().refine(isCreatorUid, 'Invalid creator/mc UID').optional(), // UID
  creator_id: z.string().refine(isCreatorUid, 'Invalid creator/mc UID').optional(), // UID alias
  note: z.string().max(1000).optional(), // Add max length for notes
  metadata: z.record(z.string(), z.any()).optional(),
});

const transformCreateShowMcSchema = createShowMcSchema.transform((data) => {
  const mcId = data.creator_id ?? data.mc_id;
  if (!mcId) {
    throw new Error('Either mc_id or creator_id is required');
  }

  return {
    showId: data.show_id,
    mcId,
    note: data.note,
    metadata: data.metadata,
  };
});

// API update schema (snake_case input, transforms to camelCase)
export const updateShowMcSchema = z
  .object({
    show_id: z.string().startsWith(ShowService.UID_PREFIX).optional(), // UID
    mc_id: z.string().refine(isCreatorUid, 'Invalid creator/mc UID').optional(), // UID
    creator_id: z.string().refine(isCreatorUid, 'Invalid creator/mc UID').optional(), // UID alias
    note: z.string().max(1000).nullable().optional(), // Add max length for notes
    metadata: z.record(z.string(), z.any()).optional(),
  })
  .transform((data) => ({
    showId: data.show_id,
    mcId: data.creator_id ?? data.mc_id,
    note: data.note,
    metadata: data.metadata,
  }));

// Schema for ShowMC with relations (used in admin endpoints)
export const showMcWithRelationsSchema = showMcSchema.extend({
  show: showSchema.optional(),
  mc: mcSchema.optional(),
});

// API output schema (transforms to snake_case)
export const showMcDto = showMcWithRelationsSchema
  .transform((obj) => ({
    id: obj.uid,
    show_id: obj.show?.uid ?? null,
    show_name: obj.show?.name ?? null,
    creator_id: obj.mc?.uid ?? null,
    creator_name: obj.mc?.name ?? null,
    creator_alias_name: obj.mc?.aliasName ?? null,
    mc_id: obj.mc?.uid ?? null,
    mc_name: obj.mc?.name ?? null,
    mc_alias_name: obj.mc?.aliasName ?? null,
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
      mc_id: z.string().nullable(),
      mc_name: z.string().nullable(),
      mc_alias_name: z.string().nullable(),
      note: z.string().nullable(),
      metadata: z.record(z.string(), z.any()),
      created_at: z.iso.datetime(),
      updated_at: z.iso.datetime(),
    }),
  );

// DTOs for input/output
export class CreateShowMcDto extends createZodDto(
  transformCreateShowMcSchema,
) {}
export class UpdateShowMcDto extends createZodDto(updateShowMcSchema) {}
export class ShowMcDto extends createZodDto(showMcDto) {}

/**
 * Payload for creating a show MC (service layer).
 */
export type CreateShowMcPayload = {
  showId: string;
  mcId: string;
  note?: string | null;
  metadata?: Record<string, any>;
};

/**
 * Payload for updating a show MC (service layer).
 */
export type UpdateShowMcPayload = {
  showId?: string;
  mcId?: string;
  note?: string | null;
  metadata?: Record<string, any>;
};

/**
 * Type-safe filter options for show MCs.
 */
export type ShowMcFilters = {
  uid?: string;
  showId?: bigint;
  mcId?: bigint;
  show?: { uid: string };
  mc?: { uid: string };
  deletedAt?: Date | null;
};

/**
 * Type-safe order by options for show MCs.
 */
export type ShowMcOrderBy = {
  createdAt?: 'asc' | 'desc';
  updatedAt?: 'asc' | 'desc';
};
