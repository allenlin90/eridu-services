import { createZodDto } from 'nestjs-zod';
import z from 'zod';

import { ClientService } from '../../client/client.service';
import { clientSchema } from '../../client/schemas/client.schema';
import { showStandardSchema } from '../../show-standard/schemas/show-standard.schema';
import { ShowStandardService } from '../../show-standard/show-standard.service';
import { showStatusSchema } from '../../show-status/schemas/show-status.schema';
import { ShowStatusService } from '../../show-status/show-status.service';
import { showTypeSchema } from '../../show-type/schemas/show-type.schema';
import { ShowTypeService } from '../../show-type/show-type.service';
import { studioRoomSchema } from '../../studio-room/schemas/studio-room.schema';
import { StudioRoomService } from '../../studio-room/studio-room.service';
import { ShowService } from '../show.service';

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
    name: z.string().min(1),
    start_time: z.string().datetime(), // ISO 8601 datetime string
    end_time: z.string().datetime(), // ISO 8601 datetime string
    metadata: z.record(z.string(), z.any()).optional(),
  })
  .transform((data) => ({
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
    name: z.string().min(1).optional(),
    start_time: z.string().datetime().optional(), // ISO 8601 datetime string
    end_time: z.string().datetime().optional(), // ISO 8601 datetime string
    metadata: z.record(z.string(), z.any()).optional(),
  })
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
export const showDto = showWithRelationsSchema.transform((obj) => ({
  id: obj.uid,
  name: obj.name,
  client_id: obj.client?.uid,
  client_name: obj.client?.name,
  studio_room_id: obj.studioRoom?.uid,
  studio_room_name: obj.studioRoom?.name,
  show_type_id: obj.showType?.uid,
  show_type_name: obj.showType?.name,
  show_status_id: obj.showStatus?.uid,
  show_status_name: obj.showStatus?.name,
  show_standard_id: obj.showStandard?.uid,
  show_standard_name: obj.showStandard?.name,
  start_time: obj.startTime.toISOString(),
  end_time: obj.endTime.toISOString(),
  metadata: obj.metadata,
  created_at: obj.createdAt,
  updated_at: obj.updatedAt,
}));

// DTOs for input/output
export class CreateShowDto extends createZodDto(createShowSchema) {}
export class UpdateShowDto extends createZodDto(updateShowSchema) {}
export class ShowDto extends createZodDto(showDto) {}
