import { createZodDto } from 'nestjs-zod';
import z from 'zod';

import {
  showDto,
  showWithRelationsSchema,
} from '@/models/show/schemas/show.schema';
import { createShowSchema } from '@/models/show/schemas/show.schema';
import { showMcWithRelationsSchema } from '@/models/show-mc/schemas/show-mc.schema';
import { createShowMcSchema } from '@/models/show-mc/schemas/show-mc.schema';
import { showPlatformWithRelationsSchema } from '@/models/show-platform/schemas/show-platform.schema';
import { createShowPlatformSchema } from '@/models/show-platform/schemas/show-platform.schema';

// Extended schema for show orchestration with MC and platform assignments
export const createShowWithAssignmentsSchema = createShowSchema.extend({
  // Optional MC assignments
  mcs: z.array(createShowMcSchema.omit({ show_id: true })).optional(),
  // Optional platform assignments
  platforms: z
    .array(createShowPlatformSchema.omit({ show_id: true }))
    .optional(),
});

const transformCreateShowWithAssignmentsSchema =
  createShowWithAssignmentsSchema.transform((data) => ({
    // Base show data
    clientId: data.client_id,
    studioRoomId: data.studio_room_id,
    showTypeId: data.show_type_id,
    showStatusId: data.show_status_id,
    showStandardId: data.show_standard_id,
    name: data.name,
    startTime: new Date(data.start_time),
    endTime: new Date(data.end_time),
    metadata: data.metadata,
    // MC assignments
    mcs: data.mcs?.map((mc) => ({
      mcId: mc.mc_id,
      note: mc.note,
      metadata: mc.metadata,
    })),
    // Platform assignments
    platforms: data.platforms?.map((platform) => ({
      platformId: platform.platform_id,
      liveStreamLink: platform.live_stream_link,
      platformShowId: platform.platform_show_id,
      viewerCount: platform.viewer_count,
      metadata: platform.metadata,
    })),
  }));

export const updateShowWithAssignmentsSchema =
  createShowWithAssignmentsSchema.partial();

const transformUpdateShowWithAssignmentsSchema =
  updateShowWithAssignmentsSchema.transform((data) => ({
    // Base show data
    clientId: data.client_id,
    studioRoomId: data.studio_room_id,
    showTypeId: data.show_type_id,
    showStatusId: data.show_status_id,
    showStandardId: data.show_standard_id,
    name: data.name,
    startTime: data.start_time ? new Date(data.start_time) : undefined,
    endTime: data.end_time ? new Date(data.end_time) : undefined,
    metadata: data.metadata,
    showMcs: data.mcs?.map((mc) => ({
      mcId: mc.mc_id,
      note: mc.note,
      metadata: mc.metadata,
    })),
    showPlatforms: data.platforms?.map((platform) => ({
      platformId: platform.platform_id,
      liveStreamLink: platform.live_stream_link,
      platformShowId: platform.platform_show_id,
      viewerCount: platform.viewer_count,
      metadata: platform.metadata,
    })),
  }));

// Extended schema for show with all relations including MCs and platforms
export const showWithAllRelationsSchema = showWithRelationsSchema.extend({
  showMCs: z.array(showMcWithRelationsSchema.omit({ show: true })).optional(),
  showPlatforms: z
    .array(showPlatformWithRelationsSchema.omit({ show: true }))
    .optional(),
});

// Extended output schema for orchestration service
export const showWithAssignmentsDto = showWithAllRelationsSchema.transform(
  (obj) => {
    // Get the base show data from the existing showDto transform
    const baseShowData = showDto.parse(obj);

    return {
      ...baseShowData,
      // MC assignments
      mcs: obj.showMCs?.map((showMc) => ({
        id: showMc.uid,
        mc_id: showMc.mc?.uid,
        mc_name: showMc.mc?.name,
        mc_alias_name: showMc.mc?.aliasName,
        note: showMc.note,
        metadata: showMc.metadata,
      })),
      // Platform assignments
      platforms: obj.showPlatforms?.map((showPlatform) => ({
        id: showPlatform.uid,
        platform_id: showPlatform.platform?.uid,
        platform_name: showPlatform.platform?.name,
        live_stream_link: showPlatform.liveStreamLink,
        platform_show_id: showPlatform.platformShowId,
        viewer_count: showPlatform.viewerCount,
        metadata: showPlatform.metadata,
      })),
    };
  },
);

// DTOs for orchestration service
export class CreateShowWithAssignmentsDto extends createZodDto(
  transformCreateShowWithAssignmentsSchema,
) {}

export class UpdateShowWithAssignmentsDto extends createZodDto(
  transformUpdateShowWithAssignmentsSchema,
) {}
export class ShowWithAssignmentsDto extends createZodDto(
  showWithAssignmentsDto,
) {}

// Schema for removing MCs from a show
export const removeMcsFromShowSchema = z.object({
  mc_ids: z.array(z.string()).min(1, 'At least one MC ID is required'),
});

// Schema for removing platforms from a show
export const removePlatformsFromShowSchema = z.object({
  platform_ids: z
    .array(z.string())
    .min(1, 'At least one platform ID is required'),
});

// Schema for replacing MCs on a show
export const replaceMcsOnShowSchema = z.object({
  mcs: z.array(
    z.object({
      mc_id: z.string(),
      note: z.string().nullable().optional(),
      metadata: z.record(z.string(), z.any()).optional(),
    }),
  ),
});

// Schema for replacing platforms on a show
export const replacePlatformsOnShowSchema = z.object({
  platforms: z.array(
    z.object({
      platform_id: z.string(),
      live_stream_link: z.string().optional(),
      platform_show_id: z.string().optional(),
      viewer_count: z.number().int().min(0).optional(),
      metadata: z.record(z.string(), z.any()).optional(),
    }),
  ),
});

// Type definitions for transformed DTOs
export interface RemoveMcsFromShowTransformed {
  mcIds: string[];
}

export interface RemovePlatformsFromShowTransformed {
  platformIds: string[];
}

export interface ReplaceMcItem {
  mcId: string;
  note?: string | null;
  metadata?: object;
}

export interface ReplaceMcsOnShowTransformed {
  mcs: ReplaceMcItem[];
}

export interface ReplacePlatformItem {
  platformId: string;
  liveStreamLink?: string;
  platformShowId?: string;
  viewerCount?: number;
  metadata?: object;
}

export interface ReplacePlatformsOnShowTransformed {
  platforms: ReplacePlatformItem[];
}

// DTOs for removing/replacing operations
export class RemoveMcsFromShowDto extends createZodDto(
  removeMcsFromShowSchema.transform((data) => ({
    mcIds: data.mc_ids,
  })),
) {
  declare mcIds: string[];
}

export class RemovePlatformsFromShowDto extends createZodDto(
  removePlatformsFromShowSchema.transform((data) => ({
    platformIds: data.platform_ids,
  })),
) {
  declare platformIds: string[];
}

export class ReplaceMcsOnShowDto extends createZodDto(
  replaceMcsOnShowSchema.transform((data) => ({
    mcs: data.mcs.map((mc) => ({
      mcId: mc.mc_id,
      note: mc.note ?? null,
      metadata: mc.metadata ?? {},
    })),
  })),
) {
  declare mcs: Array<{
    mcId: string;
    note: string | null;
    metadata: Record<string, any>;
  }>;
}

export class ReplacePlatformsOnShowDto extends createZodDto(
  replacePlatformsOnShowSchema.transform((data) => ({
    platforms: data.platforms.map((platform) => ({
      platformId: platform.platform_id,
      liveStreamLink: platform.live_stream_link ?? '',
      platformShowId: platform.platform_show_id ?? '',
      viewerCount: platform.viewer_count ?? 0,
      metadata: platform.metadata ?? {},
    })),
  })),
) {
  declare platforms: Array<{
    platformId: string;
    liveStreamLink: string;
    platformShowId: string;
    viewerCount: number;
    metadata: Record<string, any>;
  }>;
}
