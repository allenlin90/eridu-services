import { createZodDto } from 'nestjs-zod';
import z from 'zod';

import { McService } from '@/models/mc/mc.service';
import { UserService } from '@/models/user/user.service';

export const userSchema = z.object({
  id: z.bigint(),
  uid: z.string().startsWith(UserService.UID_PREFIX),
  extId: z.string().nullable(),
  email: z.email(),
  name: z.string(),
  profileUrl: z.url().nullable(),
  metadata: z.record(z.string(), z.any()),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Schema for User with MC relation
export const userWithMcSchema = z.object({
  id: z.bigint(),
  uid: z.string().startsWith(UserService.UID_PREFIX),
  extId: z.string().nullable(),
  email: z.email(),
  name: z.string(),
  profileUrl: z.url().nullable(),
  metadata: z.record(z.string(), z.any()),
  createdAt: z.date(),
  updatedAt: z.date(),
  mc: z.object({
    id: z.bigint(),
    uid: z.string().startsWith(McService.UID_PREFIX),
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

// Schema for nested MC creation (simplified from McModule)
const createNestedMcSchema = z
  .object({
    name: z.string().min(1, 'MC name is required'),
    alias_name: z.string().optional(),
    metadata: z.record(z.string(), z.any()).optional(),
  })
  .transform((data) => ({
    name: data.name,
    aliasName: data.alias_name ?? data.name,
    metadata: data.metadata,
  }));

export type CreateNestedMcSchema = z.infer<typeof createNestedMcSchema>;

// API input schema (snake_case input, transforms to camelCase)
export const createUserSchema = z
  .object({
    ext_id: z.string().min(1).optional(),
    email: z.email(),
    name: z.string().min(1, 'User name is required'),
    profile_url: z.url().optional(),
    metadata: z.record(z.string(), z.any()).optional(),
    mc: createNestedMcSchema.optional(),
  })
  .transform((data) => ({
    extId: data.ext_id ?? null,
    email: data.email,
    name: data.name,
    profileUrl: data.profile_url ?? null,
    metadata: data.metadata,
    mc: data.mc,
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
  .pipe(
    z.object({
      id: z.string(),
      ext_id: z.string().nullable(),
      email: z.email(),
      name: z.string(),
      profile_url: z.url().nullable(),
      created_at: z.iso.datetime(),
      updated_at: z.iso.datetime(),
    }),
  );

// User DTO with MC data when available
export const userWithMcDto = userWithMcSchema
  .transform((obj) => ({
    id: obj.uid,
    ext_id: obj.extId,
    email: obj.email,
    name: obj.name,
    profile_url: obj.profileUrl,
    created_at: obj.createdAt.toISOString(),
    updated_at: obj.updatedAt.toISOString(),
    mc: obj.mc
      ? {
          id: obj.mc.uid,
          name: obj.mc.name,
          alias_name: obj.mc.aliasName,
          is_banned: obj.mc.isBanned,
          metadata: obj.mc.metadata,
          created_at: obj.mc.createdAt.toISOString(),
          updated_at: obj.mc.updatedAt.toISOString(),
        }
      : null,
  }))
  .pipe(
    z.object({
      id: z.string(),
      ext_id: z.string().nullable(),
      email: z.email(),
      name: z.string(),
      profile_url: z.url().nullable(),
      created_at: z.iso.datetime(),
      updated_at: z.iso.datetime(),
      mc: z.object({
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

export class UserWithMcDto extends createZodDto(userWithMcDto) {}

export class UpdateUserDto extends createZodDto(updateUserSchema) {}

// User list filter schema
export const listUsersFilterSchema = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
});

export const listUsersQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).optional().default(10),
  })
  .and(listUsersFilterSchema)
  .transform((data) => ({
    page: data.page,
    limit: data.limit,
    take: data.limit,
    skip: (data.page - 1) * data.limit,
    name: data.name,
    email: data.email,
  }));

export class ListUsersQueryDto extends createZodDto(listUsersQuerySchema) {
  declare page: number;
  declare limit: number;
  declare take: number;
  declare skip: number;
  declare name: string | undefined;
  declare email: string | undefined;
}
