import { createZodDto } from 'nestjs-zod';
import z from 'zod';

import {
  createShowStandardInputSchema,
  showStandardApiResponseSchema,
  updateShowStandardInputSchema,
} from '@eridu/api-types/show-standards';

import { paginationQuerySchema } from '@/lib/pagination/pagination.schema';
import { ShowStandardService } from '@/models/show-standard/show-standard.service';

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
export const createShowStandardSchema = createShowStandardInputSchema.transform(
  (data) => ({
    name: data.name,
    metadata: data.metadata,
  }),
);

// CORE input schema
export const createShowStandardCoreSchema = z.object({
  name: z.string(),
  metadata: z.record(z.string(), z.any()).optional(),
});

// API input schema (snake_case input, transforms to camelCase)
export const updateShowStandardSchema = updateShowStandardInputSchema.transform(
  (data) => ({
    name: data.name,
    metadata: data.metadata,
  }),
);

export const updateShowStandardCoreSchema = z.object({
  name: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const showStandardDto = showStandardSchema
  .transform((obj) => ({
    id: obj.uid,
    name: obj.name,
    metadata: obj.metadata,
    created_at: obj.createdAt.toISOString(),
    updated_at: obj.updatedAt.toISOString(),
  }))
  .pipe(showStandardApiResponseSchema);

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

// Show Standard list filter schema
export const listShowStandardsFilterSchema = z.object({
  name: z.string().optional(),
  id: z.string().optional(),
  include_deleted: z.coerce.boolean().default(false),
});

export const listShowStandardsQuerySchema = paginationQuerySchema
  .and(listShowStandardsFilterSchema)
  .transform((data) => ({
    ...data,
    uid: data.id,
  }));

export class ListShowStandardsQueryDto extends createZodDto(listShowStandardsQuerySchema) {
  declare page: number;
  declare limit: number;
  declare take: number;
  declare skip: number;
  declare sort: 'asc' | 'desc';
  declare name: string | undefined;
  declare include_deleted: boolean;
  declare uid: string | undefined;
}

/**
 * Payload for creating a show standard (service layer).
 */
export type CreateShowStandardPayload = {
  name: string;
  metadata?: Record<string, any>;
};

/**
 * Payload for updating a show standard (service layer).
 */
export type UpdateShowStandardPayload = {
  name?: string;
  metadata?: Record<string, any>;
};

/**
 * Type-safe filter options for show standards.
 */
export type ShowStandardFilters = {
  uid?: string;
  name?: string;
  deletedAt?: Date | null;
};
