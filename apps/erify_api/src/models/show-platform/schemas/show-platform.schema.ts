import { createZodDto } from 'nestjs-zod';
import z from 'zod';

import { PlatformService } from '@/models/platform/platform.service';
import { platformSchema } from '@/models/platform/schemas/platform.schema';
import { showSchema } from '@/models/show/schemas/show.schema';
import { ShowService } from '@/models/show/show.service';
import { ShowPlatformService } from '@/models/show-platform/show-platform.service';

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
export const createShowPlatformSchema = z.object({
  show_id: z.string().startsWith(ShowService.UID_PREFIX), // UID
  platform_id: z.string().startsWith(PlatformService.UID_PREFIX), // UID
  live_stream_link: z.string(),
  platform_show_id: z.string(),
  viewer_count: z.number().int().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

const transformCreateShowPlatformSchema = createShowPlatformSchema.transform(
  (data) => ({
    showId: data.show_id,
    platformId: data.platform_id,
    liveStreamLink: data.live_stream_link,
    platformShowId: data.platform_show_id,
    viewerCount: data.viewer_count,
    metadata: data.metadata,
  }),
);

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
export const showPlatformDto = showPlatformWithRelationsSchema
  .transform((obj) => ({
    id: obj.uid,
    show_id: obj.show?.uid ?? null,
    show_name: obj.show?.name ?? null,
    platform_id: obj.platform?.uid ?? null,
    platform_name: obj.platform?.name ?? null,
    live_stream_link: obj.liveStreamLink,
    platform_show_id: obj.platformShowId,
    viewer_count: obj.viewerCount,
    metadata: obj.metadata,
    created_at: obj.createdAt.toISOString(),
    updated_at: obj.updatedAt.toISOString(),
  }))
  .pipe(
    z.object({
      id: z.string(),
      show_id: z.string().nullable(),
      show_name: z.string().nullable(),
      platform_id: z.string().nullable(),
      platform_name: z.string().nullable(),
      live_stream_link: z.string(),
      platform_show_id: z.string(),
      viewer_count: z.number().int(),
      metadata: z.record(z.string(), z.any()),
      created_at: z.iso.datetime(),
      updated_at: z.iso.datetime(),
    }),
  );

// DTOs for input/output
export class CreateShowPlatformDto extends createZodDto(
  transformCreateShowPlatformSchema,
) {}
export class UpdateShowPlatformDto extends createZodDto(
  updateShowPlatformSchema,
) {}
export class ShowPlatformDto extends createZodDto(showPlatformDto) {}
