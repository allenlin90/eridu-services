import { createZodDto } from 'nestjs-zod';
import z from 'zod';

import { PlatformService } from '../../platform/platform.service';
import { platformSchema } from '../../platform/schemas/platform.schema';
import { showSchema } from '../../show/schemas/show.schema';
import { ShowService } from '../../show/show.service';
import { ShowPlatformService } from '../show-platform.service';

// Internal schema for database entity
export const showPlatformSchema = z.object({
  id: z.bigint(),
  uid: z.string().startsWith(ShowPlatformService.UID_PREFIX),
  showId: z.bigint(),
  platformId: z.bigint(),
  liveStreamLink: z.string(),
  platformShowId: z.string(),
  viewerCount: z.number().int(),
  metadata: z.record(z.string(), z.any()),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
});

// API input schema (snake_case input, transforms to camelCase)
export const createShowPlatformSchema = z
  .object({
    show_id: z.string().startsWith(ShowService.UID_PREFIX), // UID
    platform_id: z.string().startsWith(PlatformService.UID_PREFIX), // UID
    live_stream_link: z.string(),
    platform_show_id: z.string(),
    viewer_count: z.number().int().optional(),
    metadata: z.record(z.string(), z.any()).optional(),
  })
  .transform((data) => ({
    showId: data.show_id,
    platformId: data.platform_id,
    liveStreamLink: data.live_stream_link,
    platformShowId: data.platform_show_id,
    viewerCount: data.viewer_count,
    metadata: data.metadata,
  }));

// API update schema (snake_case input, transforms to camelCase)
export const updateShowPlatformSchema = z
  .object({
    show_id: z.string().startsWith(ShowService.UID_PREFIX).optional(), // UID
    platform_id: z.string().startsWith(PlatformService.UID_PREFIX).optional(), // UID
    live_stream_link: z.string().optional(),
    platform_show_id: z.string().optional(),
    viewer_count: z.number().int().optional(),
    metadata: z.record(z.string(), z.any()).optional(),
  })
  .transform((data) => ({
    showId: data.show_id,
    platformId: data.platform_id,
    liveStreamLink: data.live_stream_link,
    platformShowId: data.platform_show_id,
    viewerCount: data.viewer_count,
    metadata: data.metadata,
  }));

// Schema for ShowPlatform with relations (used in admin endpoints)
export const showPlatformWithRelationsSchema = showPlatformSchema.extend({
  show: showSchema.optional(),
  platform: platformSchema.optional(),
});

// API output schema (transforms to snake_case)
export const showPlatformDto = showPlatformWithRelationsSchema.transform(
  (obj) => ({
    id: obj.uid,
    show_id: obj.show?.uid,
    show_name: obj.show?.name,
    platform_id: obj.platform?.uid,
    platform_name: obj.platform?.name,
    live_stream_link: obj.liveStreamLink,
    platform_show_id: obj.platformShowId,
    viewer_count: obj.viewerCount,
    metadata: obj.metadata,
    created_at: obj.createdAt,
    updated_at: obj.updatedAt,
  }),
);

// DTOs for input/output
export class CreateShowPlatformDto extends createZodDto(
  createShowPlatformSchema,
) {}
export class UpdateShowPlatformDto extends createZodDto(
  updateShowPlatformSchema,
) {}
export class ShowPlatformDto extends createZodDto(showPlatformDto) {}
