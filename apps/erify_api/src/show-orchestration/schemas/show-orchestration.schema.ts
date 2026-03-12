import { createZodDto } from 'nestjs-zod';
import z from 'zod';

import {
  createShowObjectSchema,
  createShowSchema,
  showDto,
  showWithRelationsSchema,
} from '@/models/show/schemas/show.schema';
import { showCreatorWithRelationsSchema } from '@/models/show-creator/schemas/show-creator.schema';
import { createShowPlatformSchema, showPlatformWithRelationsSchema } from '@/models/show-platform/schemas/show-platform.schema';

// Extended schema for show orchestration with creator and platform assignments
export const createShowWithAssignmentsSchema = createShowSchema.safeExtend({
  // Optional creator assignments (creator-first alias)
  creators: z.array(
    z.object({
      creator_id: z.string(),
      note: z.string().nullable().optional(),
      metadata: z.record(z.string(), z.any()).optional(),
    }),
  ).optional(),
  // Optional platform assignments
  platforms: z
    .array(createShowPlatformSchema.omit({ show_id: true }))
    .optional(),
});

const transformCreateShowWithAssignmentsSchema
  = createShowWithAssignmentsSchema.transform((data) => {
    const creatorAssignments = data.creators;

    return {
      // Base show data
      clientId: data.client_id,
      studioRoomId: data.studio_room_id,
      studioId: data.studio_id,
      showTypeId: data.show_type_id,
      showStatusId: data.show_status_id,
      showStandardId: data.show_standard_id,
      name: data.name,
      startTime: new Date(data.start_time),
      endTime: new Date(data.end_time),
      metadata: data.metadata,
      // Creator assignments normalized for orchestration service internals.
      creators: creatorAssignments?.map((creator) => ({
        creatorId: creator.creator_id,
        note: creator.note,
        metadata: creator.metadata,
      })),
      // Platform assignments
      platforms: data.platforms?.map((platform) => ({
        platformId: platform.platform_id,
        liveStreamLink: platform.live_stream_link,
        platformShowId: platform.platform_show_id,
        viewerCount: platform.viewer_count,
        metadata: platform.metadata,
      })),
    };
  });

// Build update schema from the base object (before refinements) so .partial() is valid in Zod 4.3+
export const updateShowWithAssignmentsSchema = createShowObjectSchema
  .extend({
    creators: z.array(
      z.object({
        creator_id: z.string(),
        note: z.string().nullable().optional(),
        metadata: z.record(z.string(), z.any()).optional(),
      }),
    ).optional(),
    platforms: z
      .array(createShowPlatformSchema.omit({ show_id: true }))
      .optional(),
  })
  .partial()
  .refine(
    (data) => {
      if (data.start_time && data.end_time) {
        return new Date(data.end_time) > new Date(data.start_time);
      }
      return true;
    },
    { message: 'End time must be after start time', path: ['end_time'] },
  );

const transformUpdateShowWithAssignmentsSchema
  = updateShowWithAssignmentsSchema.transform((data) => {
    const creatorAssignments = data.creators;

    return {
      // Base show data
      clientId: data.client_id,
      studioRoomId: data.studio_room_id,
      studioId: data.studio_id,
      showTypeId: data.show_type_id,
      showStatusId: data.show_status_id,
      showStandardId: data.show_standard_id,
      name: data.name,
      startTime: data.start_time ? new Date(data.start_time) : undefined,
      endTime: data.end_time ? new Date(data.end_time) : undefined,
      metadata: data.metadata,
      showCreators: creatorAssignments?.map((creator) => ({
        creatorId: creator.creator_id,
        note: creator.note,
        metadata: creator.metadata,
      })),
      showPlatforms: data.platforms?.map((platform) => ({
        platformId: platform.platform_id,
        liveStreamLink: platform.live_stream_link,
        platformShowId: platform.platform_show_id,
        viewerCount: platform.viewer_count,
        metadata: platform.metadata,
      })),
    };
  });

// Extended schema for show with all relations including creators and platforms
export const showWithAllRelationsSchema = showWithRelationsSchema.extend({
  showCreators: z.array(showCreatorWithRelationsSchema.omit({ show: true })).optional(),
  showPlatforms: z
    .array(showPlatformWithRelationsSchema.omit({ show: true }))
    .optional(),
});

// Extended output schema for orchestration service
export const showWithAssignmentsDto = showWithAllRelationsSchema.transform(
  (obj) => {
    // Get the base show data from the existing showDto transform
    const baseShowData = showDto.parse(obj);
    const creatorAssignments = obj.showCreators?.map((showCreator) => ({
      id: showCreator.uid,
      creator_id: showCreator.creator?.uid,
      creator_name: showCreator.creator?.name,
      creator_alias_name: showCreator.creator?.aliasName,
      note: showCreator.note,
      metadata: showCreator.metadata,
    }));

    return {
      ...baseShowData,
      creators: creatorAssignments,
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

// Schema for removing creators from a show (creator-first alias)
export const removeCreatorsFromShowSchema = z.object({
  creator_ids: z.array(z.string()).min(1, 'At least one creator ID is required'),
});

// Schema for removing platforms from a show
export const removePlatformsFromShowSchema = z.object({
  platform_ids: z
    .array(z.string())
    .min(1, 'At least one platform ID is required'),
});

// Schema for replacing creators on a show (creator-first alias)
export const replaceCreatorsOnShowSchema = z.object({
  creators: z.array(
    z.object({
      creator_id: z.string(),
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
      live_stream_link: z.string().nullable().optional(),
      platform_show_id: z.string().nullable().optional(),
      viewer_count: z.number().int().min(0).optional(),
      metadata: z.record(z.string(), z.any()).optional(),
    }),
  ),
});

// Type definitions for transformed DTOs
export type RemoveCreatorsFromShowTransformed = {
  creatorIds: string[];
};

export type RemovePlatformsFromShowTransformed = {
  platformIds: string[];
};

export type ReplaceCreatorItem = {
  creatorId: string;
  note?: string | null;
  metadata?: object;
};

export type ReplaceCreatorsOnShowTransformed = {
  creators: ReplaceCreatorItem[];
};

export type ReplacePlatformItem = {
  platformId: string;
  liveStreamLink?: string | null;
  platformShowId?: string | null;
  viewerCount?: number;
  metadata?: object;
};

export type ReplacePlatformsOnShowTransformed = {
  platforms: ReplacePlatformItem[];
};

// DTOs for removing/replacing operations
export class RemoveCreatorsFromShowDto extends createZodDto(
  removeCreatorsFromShowSchema.transform((data) => ({
    creatorIds: data.creator_ids,
  })),
) {
  declare creatorIds: string[];
}

export class RemovePlatformsFromShowDto extends createZodDto(
  removePlatformsFromShowSchema.transform((data) => ({
    platformIds: data.platform_ids,
  })),
) {
  declare platformIds: string[];
}

export class ReplaceCreatorsOnShowDto extends createZodDto(
  replaceCreatorsOnShowSchema.transform((data) => ({
    creators: data.creators.map((creator) => ({
      creatorId: creator.creator_id,
      note: creator.note ?? null,
      metadata: creator.metadata ?? {},
    })),
  })),
) {
  declare creators: Array<{
    creatorId: string;
    note: string | null;
    metadata: Record<string, any>;
  }>;
}

export class ReplacePlatformsOnShowDto extends createZodDto(
  replacePlatformsOnShowSchema.transform((data) => ({
    platforms: data.platforms.map((platform) => ({
      platformId: platform.platform_id,
      liveStreamLink: platform.live_stream_link ?? null,
      platformShowId: platform.platform_show_id ?? null,
      viewerCount: platform.viewer_count ?? 0,
      metadata: platform.metadata ?? {},
    })),
  })),
) {
  declare platforms: Array<{
    platformId: string;
    liveStreamLink: string | null;
    platformShowId: string | null;
    viewerCount: number;
    metadata: Record<string, any>;
  }>;
}
