import { createZodDto } from 'nestjs-zod';
import z from 'zod';

import { ShowStandardService } from '../show-standard.service';

export const showStandardSchema = z.object({
  id: z.bigint(),
  uid: z.string().startsWith(ShowStandardService.UID_PREFIX),
  name: z.string(),
  metadata: z.record(z.string(), z.any()),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
});

// API input schema (snake_case input, transforms to camelCase)
export const createShowStandardSchema = z
  .object({
    name: z.string(),
    metadata: z.record(z.string(), z.any()).optional(),
  })
  .transform((data) => ({
    name: data.name,
    metadata: data.metadata,
  }));

// CORE input schema
export const createShowStandardCoreSchema = z.object({
  name: z.string(),
  metadata: z.record(z.string(), z.any()).optional(),
});

// API input schema (snake_case input, transforms to camelCase)
export const updateShowStandardSchema = z
  .object({
    name: z.string().optional(),
    metadata: z.record(z.string(), z.any()).optional(),
  })
  .transform((data) => ({
    name: data.name,
    metadata: data.metadata,
  }));

export const updateShowStandardCoreSchema = z.object({
  name: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const showStandardDto = showStandardSchema.transform((obj) => ({
  id: obj.uid,
  name: obj.name,
  metadata: obj.metadata,
  created_at: obj.createdAt,
  updated_at: obj.updatedAt,
}));

// DTOs for input/output
export class CreateShowStandardDto extends createZodDto(
  createShowStandardSchema,
) {}
export class CreateShowStandardCoreDto extends createZodDto(
  createShowStandardCoreSchema,
) {}
export class UpdateShowStandardDto extends createZodDto(
  updateShowStandardSchema,
) {}
export class UpdateShowStandardCoreDto extends createZodDto(
  updateShowStandardCoreSchema,
) {}
export class ShowStandardDto extends createZodDto(showStandardDto) {}
