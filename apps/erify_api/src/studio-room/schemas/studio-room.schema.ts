import { createZodDto } from 'nestjs-zod';
import z from 'zod';

import { studioDto, studioSchema } from '../../studio/schemas/studio.schema';
import { StudioService } from '../../studio/studio.service';
import { StudioRoomService } from '../studio-room.service';

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
export const createStudioRoomSchema = z
  .object({
    studio_id: z.string().startsWith(StudioService.UID_PREFIX),
    name: z.string().min(1),
    capacity: z.number().int().positive(),
    metadata: z.record(z.string(), z.any()).optional().default({}),
  })
  .transform((data) => ({
    studioId: data.studio_id,
    name: data.name,
    capacity: data.capacity,
    metadata: data.metadata,
  }));

export const updateStudioRoomSchema = z
  .object({
    studio_id: z.string().startsWith(StudioService.UID_PREFIX).optional(),
    name: z.string().min(1).optional(),
    capacity: z.number().int().positive().optional(),
    metadata: z.record(z.string(), z.any()).optional(),
  })
  .transform((data) => ({
    ...(data.studio_id !== undefined && { studioId: data.studio_id }),
    ...(data.name !== undefined && { name: data.name }),
    ...(data.capacity !== undefined && { capacity: data.capacity }),
    ...(data.metadata !== undefined && { metadata: data.metadata }),
  }));

// Transform studio room to API format
export const studioRoomDto = studioRoomSchema.transform((obj) => ({
  id: obj.uid,
  studio_id: obj.studioId,
  name: obj.name,
  capacity: obj.capacity,
  metadata: obj.metadata,
  created_at: obj.createdAt,
  updated_at: obj.updatedAt,
}));

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
export const studioRoomWithStudioDto = studioRoomWithStudioSchema.transform(
  (obj) => ({
    id: obj.uid,
    studio_id: obj.studio.uid,
    name: obj.name,
    capacity: obj.capacity,
    metadata: obj.metadata,
    created_at: obj.createdAt,
    updated_at: obj.updatedAt,
    studio: obj.studio ? studioDto.parse(obj.studio) : null,
  }),
);

// DTOs for input/output
export class CreateStudioRoomDto extends createZodDto(createStudioRoomSchema) {}
export class UpdateStudioRoomDto extends createZodDto(updateStudioRoomSchema) {}
export class StudioRoomDto extends createZodDto(studioRoomDto) {}
export class StudioRoomWithStudioDto extends createZodDto(
  studioRoomWithStudioDto,
) {}
