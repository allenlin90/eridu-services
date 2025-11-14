import { createZodDto } from 'nestjs-zod';
import z from 'zod';

import { PlatformService } from '@/models/platform/platform.service';

export const platformSchema = z.object({
  id: z.bigint(),
  uid: z.string().startsWith(PlatformService.UID_PREFIX),
  name: z.string(),
  apiConfig: z.record(z.string(), z.any()),
  metadata: z.record(z.string(), z.any()),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
});

// API input schema (snake_case input, transforms to camelCase)
export const createPlatformSchema = z
  .object({
    name: z.string().min(1, 'Platform name is required'),
    api_config: z.record(z.string(), z.any()),
    metadata: z.record(z.string(), z.any()).optional(),
  })
  .transform((data) => ({
    name: data.name,
    apiConfig: data.api_config,
    metadata: data.metadata,
  }));

// CORE input schema
export const createPlatformCoreSchema = z.object({
  name: z.string(),
  apiConfig: z.record(z.string(), z.any()),
  metadata: z.record(z.string(), z.any()).optional(),
});

// API input schema (snake_case input, transforms to camelCase)
export const updatePlatformSchema = z
  .object({
    name: z.string().min(1, 'Platform name is required').optional(),
    api_config: z.record(z.string(), z.any()).optional(),
    metadata: z.record(z.string(), z.any()).optional(),
  })
  .transform((data) => ({
    name: data.name,
    apiConfig: data.api_config,
    metadata: data.metadata,
  }));

export const updatePlatformCoreSchema = z.object({
  name: z.string().optional(),
  apiConfig: z.record(z.string(), z.any()).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const platformDto = platformSchema
  .transform((obj) => ({
    id: obj.uid,
    name: obj.name,
    api_config: obj.apiConfig,
    metadata: obj.metadata,
    created_at: obj.createdAt.toISOString(),
    updated_at: obj.updatedAt.toISOString(),
  }))
  .pipe(
    z.object({
      id: z.string(),
      name: z.string(),
      api_config: z.record(z.string(), z.any()),
      metadata: z.record(z.string(), z.any()),
      created_at: z.iso.datetime(),
      updated_at: z.iso.datetime(),
    }),
  );

// DTOs for input/output
export class CreatePlatformDto extends createZodDto(createPlatformSchema) {}
export class CreatePlatformCoreDto extends createZodDto(
  createPlatformCoreSchema,
) {}
export class UpdatePlatformDto extends createZodDto(updatePlatformSchema) {}
export class UpdatePlatformCoreDto extends createZodDto(
  updatePlatformCoreSchema,
) {}
export class PlatformDto extends createZodDto(platformDto) {}
