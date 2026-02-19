// ============================================================================
// Service Layer Payload Types
// ============================================================================
// NOTE: These types CAN use Prisma types to define the payload shape.
// Services import these payload types, NOT Prisma types directly.
import { createZodDto } from 'nestjs-zod';
import z from 'zod';

import {
  createStudioRoomInputSchema,
  studioRoomApiResponseSchema,
  updateStudioRoomInputSchema,
} from '@eridu/api-types/studio-rooms';

import { studioDto, studioSchema } from '@/models/studio/schemas/studio.schema';
import { StudioRoomService } from '@/models/studio-room/studio-room.service';

export const studioRoomSchema = z.object({
  id: z.bigint(),
  uid: z.string().startsWith(StudioRoomService.UID_PREFIX),
  studioId: z.bigint(),
  name: z.string(),
  capacity: z.number().int().positive(),
  metadata: z.record(z.string(), z.any()),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
});

// API input schema (snake_case input, transforms to camelCase)
export const createStudioRoomSchema = createStudioRoomInputSchema.transform(
  (data) => ({
    studioId: data.studio_id,
    name: data.name,
    capacity: data.capacity,
    metadata: data.metadata || {},
  }),
);

export const updateStudioRoomSchema = updateStudioRoomInputSchema.transform(
  (data) => ({
    ...(data.studio_id !== undefined && { studioId: data.studio_id }),
    ...(data.name !== undefined && { name: data.name }),
    ...(data.capacity !== undefined && { capacity: data.capacity }),
    ...(data.metadata !== undefined && { metadata: data.metadata }),
  }),
);

// Basic Studio Room DTO (without studio relation)
// Note: studio_id is set to null when studio relation is not loaded.
// Use studioRoomWithStudioDto when studio_id is needed.
export const studioRoomDto = studioRoomSchema
  .transform((obj) => ({
    id: obj.uid,
    studio_id: null as string | null, // Set to null when studio relation is not loaded (use studioRoomWithStudioDto for studio_id)
    name: obj.name,
    capacity: obj.capacity,
    metadata: obj.metadata,
    created_at: obj.createdAt.toISOString(),
    updated_at: obj.updatedAt.toISOString(),
  }))
  .pipe(studioRoomApiResponseSchema);

// Schema for StudioRoom with studio data (used in admin endpoints)
export const studioRoomWithStudioSchema = z.object({
  id: z.bigint(),
  uid: z.string().startsWith(StudioRoomService.UID_PREFIX),
  studioId: z.bigint(),
  name: z.string(),
  capacity: z.number().int().positive(),
  metadata: z.record(z.string(), z.any()),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
  studio: studioSchema,
});

// Transform StudioRoom with studio to API format
export const studioRoomWithStudioDto = studioRoomWithStudioSchema
  .transform((obj) => {
    const parsedStudio = obj.studio ? studioDto.parse(obj.studio) : null;
    return {
      id: obj.uid,
      studio_id: obj.studio.uid,
      name: obj.name,
      capacity: obj.capacity,
      metadata: obj.metadata,
      created_at: obj.createdAt.toISOString(),
      updated_at: obj.updatedAt.toISOString(),
      studio: parsedStudio,
    };
  })
  .pipe(
    studioRoomApiResponseSchema.extend({
      studio_id: z.string(),
      studio: z
        .object({
          id: z.string(),
          name: z.string(),
          address: z.string(),
          metadata: z.record(z.string(), z.any()),
          created_at: z.iso.datetime(),
          updated_at: z.iso.datetime(),
        })
        .nullable(),
    }),
  );

// DTOs for input/output
export class CreateStudioRoomDto extends createZodDto(createStudioRoomSchema) {}
export class UpdateStudioRoomDto extends createZodDto(updateStudioRoomSchema) {}
export class StudioRoomDto extends createZodDto(studioRoomDto) {}
export class StudioRoomWithStudioDto extends createZodDto(
  studioRoomWithStudioDto,
) {}

/**
 * Payload for creating a studio room (service layer).
 */
export type CreateStudioRoomPayload = {
  name: string;
  capacity: number;
  metadata?: Record<string, any>;
  studioId: string;
  uid?: string;
  includeStudio?: boolean;
};

/**
 * Payload for updating a studio room (service layer).
 */
export type UpdateStudioRoomPayload = {
  name?: string;
  capacity?: number;
  metadata?: Record<string, any>;
  studioId?: string;
  includeStudio?: boolean;
};

/**
 * Type-safe filter options for studio rooms.
 */
export type StudioRoomFilters = {
  uid?: string | { contains: string; mode: 'insensitive' };
  name?: string | { contains: string; mode: 'insensitive' };
  studioId?: bigint;
  studio?: { uid: string };
  deletedAt?: Date | null;
};

/**
 * Type-safe order by options for studio rooms.
 */
export type StudioRoomOrderBy = {
  name?: 'asc' | 'desc';
  capacity?: 'asc' | 'desc';
  createdAt?: 'asc' | 'desc';
  updatedAt?: 'asc' | 'desc';
};
