// ============================================================================
// Service Layer Payload Types
// ============================================================================
// NOTE: These types CAN use Prisma types to define the payload shape.
// Services import these payload types, NOT Prisma types directly.
import { createZodDto } from 'nestjs-zod';
import z from 'zod';

import { CREATOR_COMPENSATION_TYPE } from '@eridu/api-types/creators';

import { decimalToString } from '@/lib/utils/decimal-to-string.util';
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
  agreedRate: z.unknown().nullable(), // Prisma Decimal — serialized via decimalToString()
  compensationType: z.string().nullable(),
  commissionRate: z.unknown().nullable(), // Prisma Decimal — serialized via decimalToString()
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
  agreed_rate: z.coerce.number().positive().optional(),
  compensation_type: z
    .enum(Object.values(CREATOR_COMPENSATION_TYPE) as [string, ...string[]])
    .optional(),
  commission_rate: z.coerce.number().min(0).max(100).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

const transformCreateShowCreatorSchema = createShowCreatorSchema.transform((data) => ({
  showId: data.show_id,
  creatorId: data.creator_id,
  note: data.note,
  agreedRate: data.agreed_rate !== undefined ? data.agreed_rate.toFixed(2) : undefined,
  compensationType: data.compensation_type,
  commissionRate: data.commission_rate !== undefined ? data.commission_rate.toFixed(2) : undefined,
  metadata: data.metadata,
}));

// API update schema (snake_case input, transforms to camelCase)
export const updateShowCreatorSchema = z
  .object({
    show_id: z.string().startsWith(ShowService.UID_PREFIX).optional(), // UID
    creator_id: z.string().refine(isCreatorUid, 'Invalid creator UID').optional(), // UID
    note: z.string().max(1000).nullable().optional(), // Add max length for notes
    agreed_rate: z.coerce.number().positive().nullable().optional(),
    compensation_type: z
      .enum(Object.values(CREATOR_COMPENSATION_TYPE) as [string, ...string[]])
      .nullable()
      .optional(),
    commission_rate: z.coerce.number().min(0).max(100).nullable().optional(),
    metadata: z.record(z.string(), z.any()).optional(),
  })
  .transform((data) => ({
    showId: data.show_id,
    creatorId: data.creator_id,
    note: data.note,
    agreedRate:
      data.agreed_rate === undefined
        ? undefined
        : data.agreed_rate === null
          ? null
          : data.agreed_rate.toFixed(2),
    compensationType: data.compensation_type,
    commissionRate:
      data.commission_rate === undefined
        ? undefined
        : data.commission_rate === null
          ? null
          : data.commission_rate.toFixed(2),
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
    agreed_rate: decimalToString(obj.agreedRate),
    compensation_type: obj.compensationType,
    commission_rate: decimalToString(obj.commissionRate),
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
      agreed_rate: z.string().nullable(),
      compensation_type: z.string().nullable(),
      commission_rate: z.string().nullable(),
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
  agreedRate?: string;
  compensationType?: string;
  commissionRate?: string;
  metadata?: Record<string, any>;
};

/**
 * Payload for updating a show Creator (service layer).
 */
export type UpdateShowCreatorPayload = {
  showId?: string;
  creatorId?: string;
  note?: string | null;
  agreedRate?: string | null;
  compensationType?: string | null;
  commissionRate?: string | null;
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
