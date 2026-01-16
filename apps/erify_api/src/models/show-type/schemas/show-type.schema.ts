import { createZodDto } from 'nestjs-zod';
import z from 'zod';

import {
  createShowTypeInputSchema,
  showTypeApiResponseSchema,
  updateShowTypeInputSchema,
} from '@eridu/api-types/show-types';

import { ShowTypeService } from '@/models/show-type/show-type.service';

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
export const createShowTypeSchema = createShowTypeInputSchema.transform(
  (data) => ({
    name: data.name,
    metadata: data.metadata,
  }),
);

// CORE input schema
export const createShowTypeCoreSchema = z.object({
  name: z.string(),
  metadata: z.record(z.string(), z.any()).optional(),
});

// API input schema (snake_case input, transforms to camelCase)
export const updateShowTypeSchema = updateShowTypeInputSchema.transform(
  (data) => ({
    name: data.name,
    metadata: data.metadata,
  }),
);

export const updateShowTypeCoreSchema = z.object({
  name: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const showTypeDto = showTypeSchema
  .transform((obj) => ({
    id: obj.uid,
    name: obj.name,
    metadata: obj.metadata,
    created_at: obj.createdAt.toISOString(),
    updated_at: obj.updatedAt.toISOString(),
  }))
  .pipe(showTypeApiResponseSchema);

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

// ShowType list filter schema
export const listShowTypesFilterSchema = z.object({
  name: z.string().optional(),
  id: z.string().optional(),
  include_deleted: z.coerce.boolean().default(false),
});

export const listShowTypesQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).optional().default(10),
  })
  .and(listShowTypesFilterSchema)
  .transform((data) => ({
    page: data.page,
    limit: data.limit,
    take: data.limit,
    skip: (data.page - 1) * data.limit,
    name: data.name,
    include_deleted: data.include_deleted,
    uid: data.id,
  }));

export class ListShowTypesQueryDto extends createZodDto(listShowTypesQuerySchema) {
  declare page: number;
  declare limit: number;
  declare take: number;
  declare skip: number;
  declare name: string | undefined;
  declare include_deleted: boolean;
  declare uid: string | undefined;
}
