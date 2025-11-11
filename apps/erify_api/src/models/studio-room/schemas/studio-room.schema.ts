import { createZodDto } from 'nestjs-zod';
import z from 'zod';

import { studioDto, studioSchema } from '@/models/studio/schemas/studio.schema';
import { StudioService } from '@/models/studio/studio.service';
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
export const studioRoomDto = studioRoomSchema
  .transform((obj) => ({
    id: obj.uid,
    studio_id: obj.studioId,
    name: obj.name,
    capacity: obj.capacity,
    metadata: obj.metadata,
    created_at: obj.createdAt.toISOString(),
    updated_at: obj.updatedAt.toISOString(),
  }))
  .pipe(
    z.object({
      id: z.string(),
      studio_id: z.bigint(),
      name: z.string(),
      capacity: z.number().int().positive(),
      metadata: z.record(z.string(), z.any()),
      created_at: z.iso.datetime(),
      updated_at: z.iso.datetime(),
    }),
  );

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
    z.object({
      id: z.string(),
      studio_id: z.string(),
      name: z.string(),
      capacity: z.number().int().positive(),
      metadata: z.record(z.string(), z.any()),
      created_at: z.iso.datetime(),
      updated_at: z.iso.datetime(),
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
