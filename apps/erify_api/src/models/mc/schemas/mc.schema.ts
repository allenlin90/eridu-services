// ============================================================================
// Service Layer Payload Types
// ============================================================================
// NOTE: These types CAN use Prisma types to define the payload shape.
// Services import these payload types, NOT Prisma types directly.
import { createZodDto } from 'nestjs-zod';
import z from 'zod';

import {
  createMcInputSchema,
  mcApiResponseSchema,
  updateMcInputSchema,
} from '@eridu/api-types/mcs';

import { paginationQuerySchema } from '@/lib/pagination/pagination.schema';
import { isCreatorUid } from '@/models/creator/creator-uid.util';
import { userDto, userSchema } from '@/models/user/schemas/user.schema';

function decimalToString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'number') {
    return value.toFixed(2);
  }

  if (typeof value === 'string') {
    return value;
  }

  if (
    typeof value === 'object'
    && 'toString' in value
    && typeof value.toString === 'function'
  ) {
    return value.toString();
  }

  return null;
}

export const mcSchema = z.object({
  id: z.bigint(),
  uid: z.string().refine(isCreatorUid, 'Invalid creator/mc UID'),
  userId: z.bigint().nullable(),
  name: z.string(),
  aliasName: z.string(),
  isBanned: z.boolean(),
  defaultRate: z.unknown().nullable(),
  defaultRateType: z.string().nullable(),
  defaultCommissionRate: z.unknown().nullable(),
  metadata: z.record(z.string(), z.any()),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
});

// API input schema (snake_case input, transforms to camelCase)
export const createMcSchema = createMcInputSchema.transform((data) => ({
  userId: data.user_id ?? null,
  name: data.name,
  aliasName: data.alias_name,
  defaultRate: data.default_rate?.toFixed(2),
  defaultRateType: data.default_rate_type,
  defaultCommissionRate: data.default_commission_rate?.toFixed(2),
  metadata: data.metadata,
}));

// API input schema (snake_case input, transforms to camelCase)
export const updateMcSchema = updateMcInputSchema.transform((data) => ({
  userId: data.user_id ?? null,
  name: data.name,
  aliasName: data.alias_name,
  isBanned: data.is_banned,
  defaultRate:
    data.default_rate === undefined
      ? undefined
      : data.default_rate === null
        ? null
        : data.default_rate.toFixed(2),
  defaultRateType:
    data.default_rate_type === undefined
      ? undefined
      : data.default_rate_type,
  defaultCommissionRate:
    data.default_commission_rate === undefined
      ? undefined
      : data.default_commission_rate === null
        ? null
        : data.default_commission_rate.toFixed(2),
  metadata: data.metadata,
}));

export const mcDto = mcSchema
  .transform((obj) => ({
    id: obj.uid,
    user_id: null as string | null, // Set to null when user relation is not loaded (use mcWithUserDto for user_id)
    name: obj.name,
    alias_name: obj.aliasName,
    is_banned: obj.isBanned,
    default_rate: decimalToString(obj.defaultRate),
    default_rate_type: obj.defaultRateType,
    default_commission_rate: decimalToString(obj.defaultCommissionRate),
    metadata: obj.metadata,
    created_at: obj.createdAt.toISOString(),
    updated_at: obj.updatedAt.toISOString(),
  }))
  .pipe(mcApiResponseSchema);

// Schema for MC with user data (used in admin endpoints)
export const mcWithUserSchema = z.object({
  id: z.bigint(),
  uid: z.string().refine(isCreatorUid, 'Invalid creator/mc UID'),
  userId: z.bigint().nullable(),
  name: z.string(),
  aliasName: z.string(),
  isBanned: z.boolean(),
  defaultRate: z.unknown().nullable(),
  defaultRateType: z.string().nullable(),
  defaultCommissionRate: z.unknown().nullable(),
  metadata: z.record(z.string(), z.any()),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
  user: userSchema.nullable(),
});

// Transform MC with user to API format
export const mcWithUserDto = mcWithUserSchema
  .transform((obj) => {
    const parsedUser = obj.user ? userDto.parse(obj.user) : null;
    return {
      id: obj.uid,
      user_id: obj.user?.uid ?? null,
      name: obj.name,
      alias_name: obj.aliasName,
      is_banned: obj.isBanned,
      default_rate: decimalToString(obj.defaultRate),
      default_rate_type: obj.defaultRateType,
      default_commission_rate: decimalToString(obj.defaultCommissionRate),
      metadata: obj.metadata,
      created_at: obj.createdAt.toISOString(),
      updated_at: obj.updatedAt.toISOString(),
      user: parsedUser,
    };
  })
  .pipe(
    mcApiResponseSchema.extend({
      user: z
        .object({
          id: z.string(),
          ext_id: z.string().nullable(),
          email: z.string().email(),
          name: z.string(),
          profile_url: z.url().nullable(),
          created_at: z.iso.datetime(),
          updated_at: z.iso.datetime(),
        })
        .nullable(),
    }),
  );

// DTOs for input/output
export class CreateMcDto extends createZodDto(createMcSchema) {}
export class UpdateMcDto extends createZodDto(updateMcSchema) {}
export class McDto extends createZodDto(mcDto) {}
export class McWithUserDto extends createZodDto(mcWithUserDto) {}

// MC list filter schema
export const listMcsFilterSchema = z.object({
  name: z.string().optional(),
  alias_name: z.string().optional(),
  id: z.string().optional(),
  include_deleted: z.coerce.boolean().default(false),
});

export const listMcsQuerySchema = paginationQuerySchema
  .and(listMcsFilterSchema)
  .transform((data) => {
    const { id, alias_name, ...rest } = data;
    return {
      ...rest,
      uid: id,
      aliasName: alias_name,
    };
  });

export class ListMcsQueryDto extends createZodDto(listMcsQuerySchema) {
  declare page: number;
  declare limit: number;
  declare take: number;
  declare skip: number;
  declare name?: string;
  declare aliasName: string | undefined;
  declare include_deleted: boolean;
  declare uid: string | undefined;
}

/**
 * Payload for creating an MC (service layer).
 */
export type CreateMcPayload = {
  name: string;
  aliasName: string;
  defaultRate?: string;
  defaultRateType?: string;
  defaultCommissionRate?: string;
  metadata?: Record<string, any>;
  userId?: string | null;
};

/**
 * Payload for updating an MC (service layer).
 */
export type UpdateMcPayload = {
  name?: string;
  aliasName?: string;
  isBanned?: boolean;
  defaultRate?: string | null;
  defaultRateType?: string | null;
  defaultCommissionRate?: string | null;
  metadata?: Record<string, any>;
  userId?: string | null;
};

/**
 * Type-safe order by options for MCs.
 */
export type McOrderBy = {
  name?: 'asc' | 'desc';
  aliasName?: 'asc' | 'desc';
  createdAt?: 'asc' | 'desc';
  updatedAt?: 'asc' | 'desc';
};
