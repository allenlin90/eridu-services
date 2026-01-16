import { createZodDto } from 'nestjs-zod';
import z from 'zod';

import {
  createMcInputSchema,
  mcApiResponseSchema,
  updateMcInputSchema,
} from '@eridu/api-types/mcs';

import { paginationQuerySchema } from '@/lib/pagination/pagination.schema';
import { McService } from '@/models/mc/mc.service';
import { userDto, userSchema } from '@/models/user/schemas/user.schema';

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
export const createMcSchema = createMcInputSchema.transform((data) => ({
  userId: data.user_id ?? null,
  name: data.name,
  aliasName: data.alias_name,
  metadata: data.metadata,
}));

// API input schema (snake_case input, transforms to camelCase)
export const updateMcSchema = updateMcInputSchema.transform((data) => ({
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
  .pipe(mcApiResponseSchema);

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
    mcApiResponseSchema.extend({
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

// MC list filter schema
export const listMcsFilterSchema = z.object({
  name: z.string().optional(),
  alias_name: z.string().optional(),
  include_deleted: z.coerce.boolean().default(false),
});

export const listMcsQuerySchema = paginationQuerySchema.and(listMcsFilterSchema);

export class ListMcsQueryDto extends createZodDto(listMcsQuerySchema) {
  declare page: number;
  declare limit: number;
  declare take: number;
  declare skip: number;
  declare name?: string;
  declare aliasName?: string;
  declare include_deleted: boolean;
}
