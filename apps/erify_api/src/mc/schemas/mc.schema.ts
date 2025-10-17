import { createZodDto } from 'nestjs-zod';
import z from 'zod';

import { McService } from '../mc.service';

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
});

// API input schema (snake_case input, transforms to camelCase)
export const createMcSchema = z
  .object({
    user_id: z.bigint().nullish(),
    name: z.string(),
    alias_name: z.string(),
    metadata: z.record(z.string(), z.any()).optional(),
  })
  .transform((data) => ({
    userId: data.user_id,
    name: data.name,
    aliasName: data.alias_name,
    metadata: data.metadata,
  }));

// API input schema (snake_case input, transforms to camelCase)
export const updateMcSchema = z
  .object({
    user_id: z.bigint().nullish(),
    name: z.string().optional(),
    alias_name: z.string().optional(),
    is_banned: z.boolean().optional(),
    metadata: z.record(z.string(), z.any()).optional(),
  })
  .transform((data) => ({
    userId: data.user_id,
    name: data.name,
    aliasName: data.alias_name,
    isBanned: data.is_banned,
    metadata: data.metadata,
  }));

export const mcDto = mcSchema.transform((obj) => ({
  id: obj.uid,
  user_id: obj.userId,
  name: obj.name,
  alias_name: obj.aliasName,
  is_banned: obj.isBanned,
  created_at: obj.createdAt,
  updated_at: obj.updatedAt,
}));

// DTOs for input/output
export class CreateMcDto extends createZodDto(createMcSchema) {}
export class UpdateMcDto extends createZodDto(updateMcSchema) {}
export class McDto extends createZodDto(mcDto) {}
