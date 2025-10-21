import { createZodDto } from 'nestjs-zod';
import z from 'zod';

import { ShowTypeService } from '../show-type.service';

export const showTypeSchema = z.object({
  id: z.bigint(),
  uid: z.string().startsWith(ShowTypeService.UID_PREFIX),
  name: z.string(),
  metadata: z.record(z.string(), z.any()),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
});

// API input schema (snake_case input, transforms to camelCase)
export const createShowTypeSchema = z
  .object({
    name: z.string(),
    metadata: z.record(z.string(), z.any()).optional(),
  })
  .transform((data) => ({
    name: data.name,
    metadata: data.metadata,
  }));

// CORE input schema
export const createShowTypeCoreSchema = z.object({
  name: z.string(),
  metadata: z.record(z.string(), z.any()).optional(),
});

// API input schema (snake_case input, transforms to camelCase)
export const updateShowTypeSchema = z
  .object({
    name: z.string().optional(),
    metadata: z.record(z.string(), z.any()).optional(),
  })
  .transform((data) => ({
    name: data.name,
    metadata: data.metadata,
  }));

export const updateShowTypeCoreSchema = z.object({
  name: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const showTypeDto = showTypeSchema.transform((obj) => ({
  id: obj.uid,
  name: obj.name,
  metadata: obj.metadata,
  created_at: obj.createdAt,
  updated_at: obj.updatedAt,
}));

// DTOs for input/output
export class CreateShowTypeDto extends createZodDto(createShowTypeSchema) {}
export class CreateShowTypeCoreDto extends createZodDto(
  createShowTypeCoreSchema,
) {}
export class UpdateShowTypeDto extends createZodDto(updateShowTypeSchema) {}
export class UpdateShowTypeCoreDto extends createZodDto(
  updateShowTypeCoreSchema,
) {}
export class ShowTypeDto extends createZodDto(showTypeDto) {}
