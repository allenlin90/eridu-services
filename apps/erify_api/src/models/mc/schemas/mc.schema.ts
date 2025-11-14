import { createZodDto } from 'nestjs-zod';
import z from 'zod';

import { McService } from '@/models/mc/mc.service';
import { userDto, userSchema } from '@/models/user/schemas/user.schema';
import { UserService } from '@/models/user/user.service';

export const mcSchema = z.object({
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
});

// API input schema (snake_case input, transforms to camelCase)
export const createMcSchema = z
  .object({
    user_id: z.string().startsWith(UserService.UID_PREFIX).optional(),
    name: z.string().min(1, 'MC name is required'),
    alias_name: z.string().min(1, 'Alias name is required'),
    metadata: z.record(z.string(), z.any()).optional(),
  })
  .transform((data) => ({
    userId: data.user_id ?? null,
    name: data.name,
    aliasName: data.alias_name,
    metadata: data.metadata,
  }));

// API input schema (snake_case input, transforms to camelCase)
export const updateMcSchema = z
  .object({
    user_id: z.string().startsWith(UserService.UID_PREFIX).optional(),
    name: z.string().min(1, 'MC name is required').optional(),
    alias_name: z.string().min(1, 'Alias name is required').optional(),
    is_banned: z.boolean().optional(),
    metadata: z.record(z.string(), z.any()).optional(),
  })
  .transform((data) => ({
    userId: data.user_id ?? null,
    name: data.name,
    aliasName: data.alias_name,
    isBanned: data.is_banned,
    metadata: data.metadata,
  }));

export const mcDto = mcSchema
  .transform((obj) => ({
    id: obj.uid,
    user_id: null as string | null, // Set to null when user relation is not loaded (use mcWithUserDto for user_id)
    name: obj.name,
    alias_name: obj.aliasName,
    is_banned: obj.isBanned,
    metadata: obj.metadata,
    created_at: obj.createdAt.toISOString(),
    updated_at: obj.updatedAt.toISOString(),
  }))
  .pipe(
    z.object({
      id: z.string(),
      user_id: z.string().nullable(), // Changed from bigint to string (UID)
      name: z.string(),
      alias_name: z.string(),
      is_banned: z.boolean(),
      metadata: z.record(z.string(), z.any()),
      created_at: z.iso.datetime(),
      updated_at: z.iso.datetime(),
    }),
  );

// Schema for MC with user data (used in admin endpoints)
export const mcWithUserSchema = z.object({
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
      metadata: obj.metadata,
      created_at: obj.createdAt.toISOString(),
      updated_at: obj.updatedAt.toISOString(),
      user: parsedUser,
    };
  })
  .pipe(
    z.object({
      id: z.string(),
      user_id: z.string().nullable(),
      name: z.string(),
      alias_name: z.string(),
      is_banned: z.boolean(),
      metadata: z.record(z.string(), z.any()),
      created_at: z.iso.datetime(),
      updated_at: z.iso.datetime(),
      user: z
        .object({
          id: z.string(),
          ext_id: z.string().nullable(),
          email: z.string().email(),
          name: z.string(),
          profile_url: z.string().url().nullable(),
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
