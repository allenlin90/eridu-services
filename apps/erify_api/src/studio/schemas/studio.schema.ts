import { createZodDto } from 'nestjs-zod';
import z from 'zod';

import { StudioService } from '../studio.service';

export const studioSchema = z.object({
  id: z.bigint(),
  uid: z.string().startsWith(StudioService.UID_PREFIX),
  name: z.string(),
  address: z.string(),
  metadata: z.record(z.string(), z.any()),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
});

// API input schema (snake_case input, transforms to camelCase)
export const createStudioSchema = z
  .object({
    name: z.string(),
    address: z.string(),
    metadata: z.record(z.string(), z.any()).optional(),
  })
  .transform((data) => ({
    name: data.name,
    address: data.address,
    metadata: data.metadata,
  }));

// CORE input schema
export const createStudioCoreSchema = z.object({
  name: z.string(),
  address: z.string(),
  metadata: z.record(z.string(), z.any()).optional(),
});

// API input schema (snake_case input, transforms to camelCase)
export const updateStudioSchema = z
  .object({
    name: z.string().optional(),
    address: z.string().optional(),
    metadata: z.record(z.string(), z.any()).optional(),
  })
  .transform((data) => ({
    name: data.name,
    address: data.address,
    metadata: data.metadata,
  }));

export const updateStudioCoreSchema = z.object({
  name: z.string().optional(),
  address: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const studioDto = studioSchema.transform((obj) => ({
  id: obj.uid,
  name: obj.name,
  address: obj.address,
  metadata: obj.metadata,
  created_at: obj.createdAt,
  updated_at: obj.updatedAt,
}));

// DTOs for input/output
export class CreateStudioDto extends createZodDto(createStudioSchema) {}
export class CreateStudioCoreDto extends createZodDto(createStudioCoreSchema) {}
export class UpdateStudioDto extends createZodDto(updateStudioSchema) {}
export class UpdateStudioCoreDto extends createZodDto(updateStudioCoreSchema) {}
export class StudioDto extends createZodDto(studioDto) {}
