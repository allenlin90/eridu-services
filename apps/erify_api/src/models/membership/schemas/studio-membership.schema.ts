import { createZodDto } from 'nestjs-zod';
import z from 'zod';

import {
  createMembershipInputSchema,
  membershipApiResponseSchema,
  STUDIO_ROLE,
  updateMembershipInputSchema,
} from '@eridu/api-types/memberships';

import { paginationQuerySchema } from '@/lib/pagination/pagination.schema';
import { StudioMembershipService } from '@/models/membership/studio-membership.service';
import {
  isStudioMembershipTaskHelper,
} from '@/models/membership/studio-membership-helper.util';
import { studioSchema } from '@/models/studio/schemas/studio.schema';
import { StudioService } from '@/models/studio/studio.service';
import { userDto, userSchema } from '@/models/user/schemas/user.schema';
import { UserService } from '@/models/user/user.service';

// Basic validation for UIDs from services
const validateUserUid = z.string().startsWith(UserService.UID_PREFIX);
const validateStudioUid = z.string().startsWith(StudioService.UID_PREFIX);
type MembershipMetadata = Record<string, unknown> | null | undefined;

export const studioMembershipSchema = z.object({
  id: z.bigint(),
  uid: z.string().startsWith(StudioMembershipService.UID_PREFIX),
  userId: z.bigint(),
  studioId: z.bigint(),
  role: z.enum(Object.values(STUDIO_ROLE) as [string, ...string[]]),
  baseHourlyRate: z.any().nullable(),
  metadata: z.record(z.string(), z.any()),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
});

// API input schema (snake_case input, transforms to camelCase)
export const createStudioMembershipSchema = createMembershipInputSchema
  .extend({
    base_hourly_rate: z.coerce.number().positive().optional(),
  })
  .transform((data) => ({
    userId: data.user_id,
    studioId: data.studio_id,
    role: data.role,
    ...(data.base_hourly_rate !== undefined && {
      baseHourlyRate: data.base_hourly_rate.toFixed(2),
    }),
    metadata: data.metadata || {},
  }));

// Studio-scoped create schema (studio_id comes from route param, not request body)
export const createStudioScopedMembershipSchema = z
  .object({
    user_id: validateUserUid,
    role: z.enum(Object.values(STUDIO_ROLE) as [string, ...string[]]),
    base_hourly_rate: z.coerce.number().positive().optional(),
    metadata: z.record(z.string(), z.any()).optional(),
  })
  .transform((data) => ({
    userId: data.user_id,
    role: data.role,
    ...(data.base_hourly_rate !== undefined && {
      baseHourlyRate: data.base_hourly_rate.toFixed(2),
    }),
    metadata: data.metadata || {},
  }));

// API input schema (snake_case input, transforms to camelCase)
export const updateStudioMembershipSchema = updateMembershipInputSchema
  .extend({
    base_hourly_rate: z.union([z.coerce.number().positive(), z.null()]).optional(),
  })
  .transform((data) => ({
    userId: data.user_id,
    studioId: data.studio_id,
    role: data.role,
    ...(data.base_hourly_rate !== undefined && {
      baseHourlyRate: data.base_hourly_rate === null
        ? null
        : data.base_hourly_rate.toFixed(2),
    }),
    metadata: data.metadata,
  }));

// Basic studio membership DTO (without related data)
// Note: user_id and studio_id are set to null when relations are not loaded.
// Use studioMembershipWithRelationsDto when user_id and studio_id are needed.
export const studioMembershipDto = studioMembershipSchema
  .transform((obj) => ({
    id: obj.uid,
    user_id: null as string | null, // Set to null when user relation is not loaded (use studioMembershipWithRelationsDto for user_id)
    studio_id: null as string | null, // Set to null when studio relation is not loaded (use studioMembershipWithRelationsDto for studio_id)
    role: obj.role,
    base_hourly_rate: obj.baseHourlyRate ? obj.baseHourlyRate.toString() : null,
    is_helper: isStudioMembershipTaskHelper(obj.metadata as MembershipMetadata),
    metadata: obj.metadata,
    created_at: obj.createdAt.toISOString(),
    updated_at: obj.updatedAt.toISOString(),
  }))
  .pipe(
    membershipApiResponseSchema.extend({
      base_hourly_rate: z.string().nullable(),
      is_helper: z.boolean(),
    }),
  );

// Schema for studio membership with related data (used in admin endpoints)
export const studioMembershipWithRelationsSchema = z.object({
  id: z.bigint(),
  uid: z.string().startsWith(StudioMembershipService.UID_PREFIX),
  userId: z.bigint(),
  studioId: z.bigint(),
  role: z.enum(Object.values(STUDIO_ROLE) as [string, ...string[]]),
  baseHourlyRate: z.any().nullable(),
  metadata: z.record(z.string(), z.any()),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
  user: userSchema,
  studio: studioSchema,
});

// Type for studio membership with relations
export type StudioMembershipWithRelations = z.infer<
  typeof studioMembershipWithRelationsSchema
>;

// Transform studio membership with relations to API format (properly maps UIDs)
export const studioMembershipWithRelationsDto = studioMembershipWithRelationsSchema
  .transform((obj) => {
    const parsedUser = userDto.parse(obj.user);
    return {
      id: obj.uid,
      user_id: obj.user.uid,
      studio_id: obj.studio.uid,
      role: obj.role,
      base_hourly_rate: obj.baseHourlyRate ? obj.baseHourlyRate.toString() : null,
      is_helper: isStudioMembershipTaskHelper(obj.metadata as MembershipMetadata),
      metadata: obj.metadata,
      created_at: obj.createdAt.toISOString(),
      updated_at: obj.updatedAt.toISOString(),
      user: parsedUser,
      studio: {
        id: obj.studio.uid,
        name: obj.studio.name,
        address: obj.studio.address,
      },
    };
  })
  .pipe(
    membershipApiResponseSchema.extend({
      user_id: z.string(),
      studio_id: z.string(),
      base_hourly_rate: z.string().nullable(),
      is_helper: z.boolean(),
      user: z.object({
        id: z.string(),
        ext_id: z.string().nullable(),
        email: z.string().email(),
        name: z.string(),
        profile_url: z.url().nullable(),
        created_at: z.iso.datetime(),
        updated_at: z.iso.datetime(),
      }),
      studio: z.object({
        id: z.string(),
        name: z.string(),
        address: z.string(),
      }),
    }),
  );

export type CreateStudioMembershipSchema = z.infer<
  typeof createStudioMembershipSchema
>;

// DTOs for input/output
export class CreateStudioMembershipDto extends createZodDto(
  createStudioMembershipSchema,
) {}

export class CreateStudioScopedMembershipDto extends createZodDto(
  createStudioScopedMembershipSchema,
) {}

export type StudioMembershipSchema = z.infer<typeof studioMembershipSchema>;

export class StudioMembershipDto extends createZodDto(studioMembershipDto) {}

export class StudioMembershipWithRelationsDto extends createZodDto(
  studioMembershipWithRelationsDto,
) {}

export class UpdateStudioMembershipDto extends createZodDto(
  updateStudioMembershipSchema,
) {}

export const updateStudioMembershipRoleSchema = z
  .object({
    role: z.enum(Object.values(STUDIO_ROLE) as [string, ...string[]]),
  })
  .transform((data) => ({
    role: data.role,
  }));

export class UpdateStudioMembershipRoleDto extends createZodDto(
  updateStudioMembershipRoleSchema,
) {}

export const updateStudioMembershipHelperSchema = z
  .object({
    is_helper: z.boolean(),
  })
  .transform((data) => ({
    isHelper: data.is_helper,
  }));

export class UpdateStudioMembershipHelperDto extends createZodDto(
  updateStudioMembershipHelperSchema,
) {}

// Service-level internal schemas (camelCase) and assert helpers

export const createStudioMembershipInternalSchema = z
  .object({
    userId: validateUserUid,
    studioId: validateStudioUid,
    role: z.enum(Object.values(STUDIO_ROLE) as [string, ...string[]]),
    baseHourlyRate: z.string().optional(),
    metadata: z.record(z.string(), z.any()).default({}),
  })
  .strict();

export type CreateStudioMembershipInternal = z.infer<
  typeof createStudioMembershipInternalSchema
>;

export const updateStudioMembershipInternalSchema = z
  .object({
    userId: validateUserUid.optional(),
    studioId: validateStudioUid.optional(),
    role: z.enum(Object.values(STUDIO_ROLE) as [string, ...string[]]).optional(),
    baseHourlyRate: z.union([z.string(), z.null()]).optional(),
    metadata: z.record(z.string(), z.any()).optional(),
  })
  .strict();

export type UpdateStudioMembershipInternal = z.infer<
  typeof updateStudioMembershipInternalSchema
>;

export const studioRoleSchema = z.enum(
  Object.values(STUDIO_ROLE) as [string, ...string[]],
);

// Type exports for constants
export type StudioRole = (typeof STUDIO_ROLE)[keyof typeof STUDIO_ROLE];

// Assert helpers: throw ZodError including all issues
export function assertCreateStudioMembershipInput(
  data: unknown,
): CreateStudioMembershipInternal {
  return createStudioMembershipInternalSchema.parse(data);
}

export function assertUpdateStudioMembershipInput(
  data: unknown,
): UpdateStudioMembershipInternal {
  return updateStudioMembershipInternalSchema.parse(data);
}

export function assertStudioRole(value: unknown): string {
  return studioRoleSchema.parse(value);
}

// Studio Membership list filter schema
export const listStudioMembershipsFilterSchema = z.object({
  name: z.string().optional(),
  id: z.string().optional(),
  studio_id: z.string().optional(),
  include_deleted: z.coerce.boolean().default(false),
});

export const listStudioMembershipsQuerySchema = paginationQuerySchema
  .and(listStudioMembershipsFilterSchema)
  .transform((data) => ({
    ...data,
    uid: data.id,
    studioId: data.studio_id,
  }));

export class ListStudioMembershipsQueryDto extends createZodDto(listStudioMembershipsQuerySchema) {
  declare page: number;
  declare limit: number;
  declare take: number;
  declare skip: number;
  declare sort: 'asc' | 'desc';
  declare name: string | undefined;
  declare include_deleted: boolean;
  declare uid: string | undefined;
  declare studioId: string | undefined;
}

/**
 * Payload for creating a studio membership (service layer).
 */
export type CreateStudioMembershipPayload = {
  userId: string;
  studioId: string;
  role: string;
  baseHourlyRate?: string;
  metadata?: Record<string, any>;
};

/**
 * Payload for updating a studio membership (service layer).
 */
export type UpdateStudioMembershipPayload = {
  userId?: string;
  studioId?: string;
  role?: string;
  baseHourlyRate?: string | null;
  metadata?: Record<string, any>;
};

/**
 * Type-safe filter options for studio memberships.
 */
export type StudioMembershipFilters = {
  uid?: string | { contains: string; mode: 'insensitive' };
  userId?: bigint;
  studioId?: bigint;
  role?: string;
  user?: { uid: string } | { ext_id: string };
  studio?: { uid: string | { contains: string; mode: 'insensitive' } };
  deletedAt?: Date | null;
};

/**
 * Type-safe order by options for studio memberships.
 */
export type StudioMembershipOrderBy = {
  createdAt?: 'asc' | 'desc';
  updatedAt?: 'asc' | 'desc';
  role?: 'asc' | 'desc';
};
