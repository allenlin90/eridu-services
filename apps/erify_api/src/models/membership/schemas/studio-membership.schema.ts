import { createZodDto } from 'nestjs-zod';
import z from 'zod';

import { StudioMembershipService } from '@/models/membership/studio-membership.service';
import { studioSchema } from '@/models/studio/schemas/studio.schema';
import { StudioService } from '@/models/studio/studio.service';
import { userDto, userSchema } from '@/models/user/schemas/user.schema';
import { UserService } from '@/models/user/user.service';

// Role types for studio membership permissions
export const STUDIO_ROLE = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  MEMBER: 'member',
} as const;

// Reusable validation functions
const validateUserUid = z.string().startsWith(UserService.UID_PREFIX);
const validateStudioUid = z.string().startsWith(StudioService.UID_PREFIX);

export const studioMembershipSchema = z.object({
  id: z.bigint(),
  uid: z.string().startsWith(StudioMembershipService.UID_PREFIX),
  userId: z.bigint(),
  studioId: z.bigint(),
  role: z.enum(Object.values(STUDIO_ROLE) as [string, ...string[]]),
  metadata: z.record(z.string(), z.any()),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
});

// API input schema (snake_case input, transforms to camelCase)
export const createStudioMembershipSchema = z
  .object({
    user_id: validateUserUid,
    studio_id: validateStudioUid,
    role: z.enum(Object.values(STUDIO_ROLE) as [string, ...string[]]),
    metadata: z.record(z.string(), z.any()).optional(),
  })
  .transform((data) => ({
    userId: data.user_id,
    studioId: data.studio_id,
    role: data.role,
    metadata: data.metadata || {},
  }));

// API input schema (snake_case input, transforms to camelCase)
export const updateStudioMembershipSchema = z
  .object({
    user_id: validateUserUid.optional(),
    studio_id: validateStudioUid.optional(),
    role: z
      .enum(Object.values(STUDIO_ROLE) as [string, ...string[]])
      .optional(),
    metadata: z.record(z.string(), z.any()).optional(),
  })
  .transform((data) => ({
    userId: data.user_id,
    studioId: data.studio_id,
    role: data.role,
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
    metadata: obj.metadata,
    created_at: obj.createdAt.toISOString(),
    updated_at: obj.updatedAt.toISOString(),
  }))
  .pipe(
    z.object({
      id: z.string(),
      user_id: z.string().nullable(), // Changed from bigint to string (UID)
      studio_id: z.string().nullable(), // Changed from bigint to string (UID)
      role: z.enum(Object.values(STUDIO_ROLE) as [string, ...string[]]),
      metadata: z.record(z.string(), z.any()),
      created_at: z.iso.datetime(),
      updated_at: z.iso.datetime(),
    }),
  );

// Schema for studio membership with related data (used in admin endpoints)
export const studioMembershipWithRelationsSchema = z.object({
  id: z.bigint(),
  uid: z.string().startsWith(StudioMembershipService.UID_PREFIX),
  userId: z.bigint(),
  studioId: z.bigint(),
  role: z.enum(Object.values(STUDIO_ROLE) as [string, ...string[]]),
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
export const studioMembershipWithRelationsDto =
  studioMembershipWithRelationsSchema
    .transform((obj) => {
      const parsedUser = userDto.parse(obj.user);
      return {
        id: obj.uid,
        user_id: obj.user.uid,
        studio_id: obj.studio.uid,
        role: obj.role,
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
      z.object({
        id: z.string(),
        user_id: z.string(),
        studio_id: z.string(),
        role: z.enum(Object.values(STUDIO_ROLE) as [string, ...string[]]),
        metadata: z.record(z.string(), z.any()),
        created_at: z.iso.datetime(),
        updated_at: z.iso.datetime(),
        user: z.object({
          id: z.string(),
          ext_id: z.string().nullable(),
          email: z.string().email(),
          name: z.string(),
          profile_url: z.string().url().nullable(),
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

export type StudioMembershipSchema = z.infer<typeof studioMembershipSchema>;

export class StudioMembershipDto extends createZodDto(studioMembershipDto) {}

export class StudioMembershipWithRelationsDto extends createZodDto(
  studioMembershipWithRelationsDto,
) {}

export class UpdateStudioMembershipDto extends createZodDto(
  updateStudioMembershipSchema,
) {}

// Service-level internal schemas (camelCase) and assert helpers

export const createStudioMembershipInternalSchema = z
  .object({
    userId: validateUserUid,
    studioId: validateStudioUid,
    role: z.enum(Object.values(STUDIO_ROLE) as [string, ...string[]]),
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
    role: z
      .enum(Object.values(STUDIO_ROLE) as [string, ...string[]])
      .optional(),
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
