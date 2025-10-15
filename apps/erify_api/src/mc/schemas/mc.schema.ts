import { createZodDto } from 'nestjs-zod';
import z from 'zod';

import { McService } from '../mc.service';

export const mcSchema = z.object({
  id: z.number(),
  uid: z.string().startsWith(McService.UID_PREFIX),
  userId: z.number().nullable(),
  name: z.string(),
  aliasName: z.string(),
  isBanned: z.boolean(),
  metadata: z.record(z.string(), z.any()),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const createMcSchema = mcSchema
  .pick({
    userId: true,
    name: true,
    aliasName: true,
    metadata: true,
  })
  .extend({
    userId: z.number().int().nullish(),
    metadata: z.record(z.string(), z.any()).optional(),
  });

export const updateMcSchema = mcSchema
  .pick({
    userId: true,
    name: true,
    aliasName: true,
    isBanned: true,
    metadata: true,
  })
  .partial();

export const mcDto = mcSchema.transform((obj) => ({
  id: obj.uid,
  user_id: obj.userId,
  name: obj.name,
  alias_name: obj.aliasName,
  is_banned: obj.isBanned,
  created_at: obj.createdAt,
  updated_at: obj.updatedAt,
}));

export class CreateMcDto extends createZodDto(createMcSchema) {}
export class UpdateMcDto extends createZodDto(updateMcSchema) {}
export class McDto extends createZodDto(mcDto) {}
