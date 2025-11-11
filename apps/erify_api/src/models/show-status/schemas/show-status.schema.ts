import { createZodDto } from 'nestjs-zod';
import z from 'zod';

import { ShowStatusService } from '@/models/show-status/show-status.service';

export const showStatusSchema = z.object({
  id: z.bigint(),
  uid: z.string().startsWith(ShowStatusService.UID_PREFIX),
  name: z.string(),
  metadata: z.record(z.string(), z.any()),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
});

// API input schema (snake_case input, transforms to camelCase)
export const createShowStatusSchema = z
  .object({
    name: z.string(),
    metadata: z.record(z.string(), z.any()).optional(),
  })
  .transform((data) => ({
    name: data.name,
    metadata: data.metadata,
  }));

// CORE input schema
export const createShowStatusCoreSchema = z.object({
  name: z.string(),
  metadata: z.record(z.string(), z.any()).optional(),
});

// API input schema (snake_case input, transforms to camelCase)
export const updateShowStatusSchema = z
  .object({
    name: z.string().optional(),
    metadata: z.record(z.string(), z.any()).optional(),
  })
  .transform((data) => ({
    name: data.name,
    metadata: data.metadata,
  }));

export const updateShowStatusCoreSchema = z.object({
  name: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const showStatusDto = showStatusSchema
  .transform((obj) => ({
    id: obj.uid,
    name: obj.name,
    metadata: obj.metadata,
    created_at: obj.createdAt.toISOString(),
    updated_at: obj.updatedAt.toISOString(),
  }))
  .pipe(
    z.object({
      id: z.string(),
      name: z.string(),
      metadata: z.record(z.string(), z.any()),
      created_at: z.iso.datetime(),
      updated_at: z.iso.datetime(),
    }),
  );

// DTOs for input/output
export class CreateShowStatusDto extends createZodDto(createShowStatusSchema) {}
export class CreateShowStatusCoreDto extends createZodDto(
  createShowStatusCoreSchema,
) {}
export class UpdateShowStatusDto extends createZodDto(updateShowStatusSchema) {}
export class UpdateShowStatusCoreDto extends createZodDto(
  updateShowStatusCoreSchema,
) {}
export class ShowStatusDto extends createZodDto(showStatusDto) {}
