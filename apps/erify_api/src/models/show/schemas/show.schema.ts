import { createZodDto } from 'nestjs-zod';
import z from 'zod';

import { showApiResponseSchema } from '@eridu/api-types/shows';

import { paginationQuerySchema } from '@/lib/pagination/pagination.schema';
import { ClientService } from '@/models/client/client.service';
import { clientSchema } from '@/models/client/schemas/client.schema';
import { ShowService } from '@/models/show/show.service';
import { showStandardSchema } from '@/models/show-standard/schemas/show-standard.schema';
import { ShowStandardService } from '@/models/show-standard/show-standard.service';
import { showStatusSchema } from '@/models/show-status/schemas/show-status.schema';
import { ShowStatusService } from '@/models/show-status/show-status.service';
import { showTypeSchema } from '@/models/show-type/schemas/show-type.schema';
import { ShowTypeService } from '@/models/show-type/show-type.service';
import { studioRoomSchema } from '@/models/studio-room/schemas/studio-room.schema';
import { StudioRoomService } from '@/models/studio-room/studio-room.service';

// Internal schema for database entity
export const showSchema = z.object({
  id: z.bigint(),
  uid: z.string().startsWith(ShowService.UID_PREFIX),
  clientId: z.bigint(),
  studioRoomId: z.bigint(),
  showTypeId: z.bigint(),
  showStatusId: z.bigint(),
  showStandardId: z.bigint(),
  name: z.string(),
  startTime: z.date(),
  endTime: z.date(),
  metadata: z.record(z.string(), z.any()),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// API input schema (snake_case input, transforms to camelCase)
export const createShowSchema = z
  .object({
    client_id: z.string().startsWith(ClientService.UID_PREFIX), // UID
    studio_room_id: z.string().startsWith(StudioRoomService.UID_PREFIX), // UID
    show_type_id: z.string().startsWith(ShowTypeService.UID_PREFIX), // UID
    show_status_id: z.string().startsWith(ShowStatusService.UID_PREFIX), // UID
    show_standard_id: z.string().startsWith(ShowStandardService.UID_PREFIX), // UID
    name: z.string().min(1, 'Show name is required'),
    start_time: z.iso.datetime(), // ISO 8601 datetime string
    end_time: z.iso.datetime(), // ISO 8601 datetime string
    metadata: z.record(z.string(), z.any()).optional(),
  })
  .refine((data) => new Date(data.end_time) > new Date(data.start_time), {
    message: 'End time must be after start time',
    path: ['end_time'],
  });

const transformCreateShowSchema = createShowSchema.transform((data) => ({
  clientId: data.client_id,
  studioRoomId: data.studio_room_id,
  showTypeId: data.show_type_id,
  showStatusId: data.show_status_id,
  showStandardId: data.show_standard_id,
  name: data.name,
  startTime: new Date(data.start_time),
  endTime: new Date(data.end_time),
  metadata: data.metadata,
}));

// API update schema (snake_case input, transforms to camelCase)
export const updateShowSchema = z
  .object({
    client_id: z.string().startsWith(ClientService.UID_PREFIX).optional(), // UID
    studio_room_id: z
      .string()
      .startsWith(StudioRoomService.UID_PREFIX)
      .optional(), // UID
    show_type_id: z.string().startsWith(ShowTypeService.UID_PREFIX).optional(), // UID
    show_status_id: z
      .string()
      .startsWith(ShowStatusService.UID_PREFIX)
      .optional(), // UID
    show_standard_id: z
      .string()
      .startsWith(ShowStandardService.UID_PREFIX)
      .optional(), // UID
    name: z.string().min(1, 'Show name is required').optional(),
    start_time: z.iso.datetime().optional(), // ISO 8601 datetime string
    end_time: z.iso.datetime().optional(), // ISO 8601 datetime string
    metadata: z.record(z.string(), z.any()).optional(),
  })
  .refine(
    (data) => {
      // Only validate if both times are provided
      if (data.start_time && data.end_time) {
        return new Date(data.end_time) > new Date(data.start_time);
      }
      return true;
    },
    {
      message: 'End time must be after start time',
      path: ['end_time'],
    },
  )
  .transform((data) => ({
    clientId: data.client_id,
    studioRoomId: data.studio_room_id,
    showTypeId: data.show_type_id,
    showStatusId: data.show_status_id,
    showStandardId: data.show_standard_id,
    name: data.name,
    startTime: data.start_time ? new Date(data.start_time) : undefined,
    endTime: data.end_time ? new Date(data.end_time) : undefined,
    metadata: data.metadata,
  }));

// Schema for Show with relations (used in admin endpoints)
export const showWithRelationsSchema = showSchema.extend({
  client: clientSchema.optional(),
  studioRoom: studioRoomSchema.optional(),
  showType: showTypeSchema.optional(),
  showStatus: showStatusSchema.optional(),
  showStandard: showStandardSchema.optional(),
});

// API output schema (transforms to snake_case)
// Uses shared schema from @eridu/api-types for consistency
export const showDto = showWithRelationsSchema
  .transform((obj) => ({
    id: obj.uid,
    name: obj.name,
    client_id: obj.client?.uid ?? null,
    client_name: obj.client?.name ?? null,
    studio_room_id: obj.studioRoom?.uid ?? null,
    studio_room_name: obj.studioRoom?.name ?? null,
    show_type_id: obj.showType?.uid ?? null,
    show_type_name: obj.showType?.name ?? null,
    show_status_id: obj.showStatus?.uid ?? null,
    show_status_name: obj.showStatus?.name ?? null,
    show_standard_id: obj.showStandard?.uid ?? null,
    show_standard_name: obj.showStandard?.name ?? null,
    start_time: obj.startTime.toISOString(),
    end_time: obj.endTime.toISOString(),
    metadata: obj.metadata,
    created_at: obj.createdAt.toISOString(),
    updated_at: obj.updatedAt.toISOString(),
  }))
  .pipe(showApiResponseSchema);

export const listShowsFilterSchema = z.object({
  name: z.string().optional(),
  client_name: z.string().optional(),
  mc_name: z.string().optional(),
  client_id: z
    .union([
      z.string().startsWith(ClientService.UID_PREFIX),
      z.array(z.string().startsWith(ClientService.UID_PREFIX)),
    ])
    .optional(),
  start_date_from: z.iso.datetime().optional(),
  start_date_to: z.iso.datetime().optional(),
  end_date_from: z.iso.datetime().optional(),
  end_date_to: z.iso.datetime().optional(),
  order_by: z
    .enum(['created_at', 'updated_at', 'start_time', 'end_time'])
    .default('created_at'),
  order_direction: z.enum(['asc', 'desc']).default('desc'),
  include_deleted: z.coerce.boolean().default(false),
});

export const listShowsQuerySchema = paginationQuerySchema.and(listShowsFilterSchema);

export class ListShowsQueryDto extends createZodDto(listShowsQuerySchema) {
  declare page: number;
  declare limit: number;
  declare take: number;
  declare skip: number;
  declare name?: string;
  declare client_name?: string;
  declare mc_name?: string;
  declare client_id?: string | string[];
  declare start_date_from?: string;
  declare start_date_to?: string;
  declare end_date_from?: string;
  declare end_date_to?: string;
  declare order_by: 'created_at' | 'updated_at' | 'start_time' | 'end_time';
  declare order_direction: 'asc' | 'desc';
  declare include_deleted: boolean;
}

// DTOs for input/output
export class CreateShowDto extends createZodDto(transformCreateShowSchema) {}
export class UpdateShowDto extends createZodDto(updateShowSchema) {}
export class ShowDto extends createZodDto(showDto) {}
