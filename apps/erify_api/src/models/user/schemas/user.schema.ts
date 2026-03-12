// ============================================================================
// Service Layer Payload Types
// ============================================================================
// NOTE: These types CAN use Prisma types to define the payload shape.
// Services import these payload types, NOT Prisma types directly.
import type { Prisma } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import z from 'zod';

import {
  adminUserApiResponseSchema,
  userApiResponseSchema,
} from '@eridu/api-types/users';

import { paginationQuerySchema } from '@/lib/pagination/pagination.schema';
import { isCreatorUid } from '@/models/creator/creator-uid.util';
import { UserService } from '@/models/user/user.service';

export const userSchema = z.object({
  id: z.bigint(),
  uid: z.string().startsWith(UserService.UID_PREFIX),
  extId: z.string().nullable(),
  email: z.email(),
  name: z.string(),
  profileUrl: z.url().nullable(),
  isSystemAdmin: z.boolean(),
  metadata: z.record(z.string(), z.any()),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Schema for User with creator relation
export const userWithCreatorSchema = z.object({
  id: z.bigint(),
  uid: z.string().startsWith(UserService.UID_PREFIX),
  extId: z.string().nullable(),
  email: z.email(),
  name: z.string(),
  profileUrl: z.url().nullable(),
  metadata: z.record(z.string(), z.any()),
  createdAt: z.date(),
  updatedAt: z.date(),
  creator: z.object({
    id: z.bigint(),
    uid: z.string().refine(isCreatorUid, 'Invalid creator UID'),
    userId: z.bigint().nullable(),
    name: z.string(),
    aliasName: z.string(),
    isBanned: z.boolean(),
    metadata: z.record(z.string(), z.any()),
    createdAt: z.date(),
    updatedAt: z.date(),
    deletedAt: z.date().nullable(),
  }).nullable(),
});

// Schema for nested creator creation (simplified from CreatorModule)
const createNestedCreatorSchema = z
  .object({
    name: z.string().min(1, 'Creator name is required'),
    alias_name: z.string().optional(),
    metadata: z.record(z.string(), z.any()).optional(),
  })
  .transform((data) => ({
    name: data.name,
    aliasName: data.alias_name ?? data.name,
    metadata: data.metadata,
  }));

export type CreateNestedCreatorSchema = z.infer<typeof createNestedCreatorSchema>;

// API input schema (snake_case input, transforms to camelCase)
export const createUserSchema = z
  .object({
    ext_id: z.string().min(1).optional(),
    email: z.email(),
    name: z.string().min(1, 'User name is required'),
    profile_url: z.url().optional(),
    metadata: z.record(z.string(), z.any()).optional(),
    creator: createNestedCreatorSchema.optional(),
    // Explicitly reject legacy alias at API boundary during S4 cutover.
    mc: z.never().optional(),
  })
  .transform((data) => ({
    extId: data.ext_id ?? null,
    email: data.email,
    name: data.name,
    profileUrl: data.profile_url ?? null,
    metadata: data.metadata,
    creator: data.creator,
  }));

export const bulkCreateUserSchema = z.object({
  data: z.array(createUserSchema),
});

// API input schema (snake_case input, transforms to camelCase)
export const updateUserSchema = z
  .object({
    // Allow null or empty string to clear the value
    ext_id: z.union([z.string(), z.null()]).optional(),
    email: z.email().optional(),
    name: z.string().min(1, 'User name is required').optional(),
    // Allow null or empty string to clear the value
    profile_url: z.union([z.string().url(), z.literal(''), z.null()]).optional(),
    is_system_admin: z.boolean().optional(),
    metadata: z.record(z.string(), z.any()).optional(),
  })
  .transform((data) => {
    // Only include fields that are present in the input
    // DO NOT default to null, as this overwrites existing data with null
    const result: any = {};

    // Transform empty string or null to null for nullable fields
    if (data.ext_id !== undefined) {
      result.extId = (data.ext_id === '' || data.ext_id === null) ? null : data.ext_id;
    }

    if (data.email !== undefined)
      result.email = data.email;
    if (data.name !== undefined)
      result.name = data.name;

    // Transform empty string or null to null for nullable fields
    if (data.profile_url !== undefined) {
      result.profileUrl = (data.profile_url === '' || data.profile_url === null) ? null : data.profile_url;
    }

    if (data.metadata !== undefined)
      result.metadata = data.metadata;
    if (data.is_system_admin !== undefined)
      result.isSystemAdmin = data.is_system_admin;
    return result;
  });

export const userDto = userSchema
  .transform((obj) => ({
    id: obj.uid,
    ext_id: obj.extId,
    email: obj.email,
    name: obj.name,
    profile_url: obj.profileUrl,
    created_at: obj.createdAt.toISOString(),
    updated_at: obj.updatedAt.toISOString(),
  }))
  .pipe(userApiResponseSchema);

// Admin User DTO (includes is_system_admin)
export const adminUserDto = userSchema
  .transform((obj) => ({
    id: obj.uid,
    ext_id: obj.extId,
    email: obj.email,
    name: obj.name,
    profile_url: obj.profileUrl,
    is_system_admin: obj.isSystemAdmin,
    created_at: obj.createdAt.toISOString(),
    updated_at: obj.updatedAt.toISOString(),
  }))
  .pipe(adminUserApiResponseSchema);

// User DTO with creator data when available
export const userWithCreatorDto = userWithCreatorSchema
  .transform((obj) => {
    const creator = obj.creator
      ? {
          id: obj.creator.uid,
          name: obj.creator.name,
          alias_name: obj.creator.aliasName,
          is_banned: obj.creator.isBanned,
          metadata: obj.creator.metadata,
          created_at: obj.creator.createdAt.toISOString(),
          updated_at: obj.creator.updatedAt.toISOString(),
        }
      : null;

    return {
      id: obj.uid,
      ext_id: obj.extId,
      email: obj.email,
      name: obj.name,
      profile_url: obj.profileUrl,
      created_at: obj.createdAt.toISOString(),
      updated_at: obj.updatedAt.toISOString(),
      creator,
    };
  })
  .pipe(
    z.object({
      id: z.string(),
      ext_id: z.string().nullable(),
      email: z.email(),
      name: z.string(),
      profile_url: z.url().nullable(),
      created_at: z.iso.datetime(),
      updated_at: z.iso.datetime(),
      creator: z.object({
        id: z.string(),
        name: z.string(),
        alias_name: z.string(),
        is_banned: z.boolean(),
        metadata: z.record(z.string(), z.any()),
        created_at: z.iso.datetime(),
        updated_at: z.iso.datetime(),
      }).nullable(),
    }),
  );

export type CreateUserSchema = z.infer<typeof createUserSchema>;

// DTOs for input/output
export class CreateUserDto extends createZodDto(createUserSchema) {}

export class BulkCreateUserDto extends createZodDto(bulkCreateUserSchema) {}

export type UserSchema = z.infer<typeof userSchema>;

export class UserDto extends createZodDto(userDto) {}

export class AdminUserDto extends createZodDto(adminUserDto) {}

export class UserWithCreatorDto extends createZodDto(userWithCreatorDto) {}

export class UpdateUserDto extends createZodDto(updateUserSchema) {}

// User list filter schema
export const listUsersFilterSchema = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
  id: z.string().optional(),
  ext_id: z.string().optional(),
  is_system_admin: z.preprocess(
    (val) => {
      if (val === 'true' || val === true)
        return true;
      if (val === 'false' || val === false)
        return false;
      return undefined;
    },
    z.boolean().optional(),
  ),
});

export const listUsersQuerySchema = paginationQuerySchema
  .and(listUsersFilterSchema)
  .transform((data) => ({
    ...data,
    uid: data.id,
    extId: data.ext_id,
    isSystemAdmin: data.is_system_admin,
  }));

export class ListUsersQueryDto extends createZodDto(listUsersQuerySchema) {
  declare page: number;
  declare limit: number;
  declare take: number;
  declare skip: number;
  declare sort: 'asc' | 'desc';
  declare name: string | undefined;
  declare email: string | undefined;
  declare uid: string | undefined;
  declare extId: string | undefined;
  declare isSystemAdmin: boolean | undefined;
}

/**
 * Payload for creating a user (service layer).
 */
export type CreateUserPayload = {
  extId: string | null;
  email: string;
  name: string;
  profileUrl: string | null;
  metadata?: Record<string, any>;
  creator?: {
    name: string;
    aliasName: string;
    metadata?: Record<string, any>;
  };
};

/**
 * Payload for updating a user (service layer).
 */
export type UpdateUserPayload = {
  extId?: string | null;
  email?: string;
  name?: string;
  profileUrl?: string | null;
  metadata?: Record<string, any>;
  isSystemAdmin?: boolean;
};

/**
 * Type-safe filter options for users.
 */
export type UserFilters = {
  uid?: string;
  extId?: string;
  email?: string;
  name?: string;
  isSystemAdmin?: boolean;
};

/**
 * Type-safe order by options for users.
 */
export type UserOrderBy = Pick<
  Prisma.UserOrderByWithRelationInput,
  'name' | 'email' | 'createdAt' | 'updatedAt'
>;
