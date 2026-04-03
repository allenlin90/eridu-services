import type { Prisma } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import z from 'zod';

import {
  createStudioShowInputSchema,
  showApiResponseSchema,
  studioShowDetailSchema,
  updateStudioShowInputSchema,
} from '@eridu/api-types/shows';

import { paginationQuerySchema } from '@/lib/pagination/pagination.schema';
import { ClientService } from '@/models/client/client.service';
import { SHOW_UID_PREFIX } from '@/models/show/show-uid.util';
import { ShowStandardService } from '@/models/show-standard/show-standard.service';
import { ShowStatusService } from '@/models/show-status/show-status.service';
import { ShowTypeService } from '@/models/show-type/show-type.service';
import { StudioService } from '@/models/studio/studio.service';
import { StudioRoomService } from '@/models/studio-room/studio-room.service';

// Re-exported Prisma types for service consumption (schemas CAN import Prisma)
export type ShowInclude = Prisma.ShowInclude;
export type ShowWithPayload<T extends ShowInclude> = Prisma.ShowGetPayload<{ include: T }>;

// Domain-level payload for creating a show
export type CreateShowPayload = {
  name: string;
  startTime: Date;
  endTime: Date;
  metadata?: Record<string, any>;
  clientId: string;
  studioRoomId?: string | null;
  studioId?: string | null;
  showTypeId: string;
  showStatusId: string;
  showStandardId: string;
};

// Domain-level payload for updating a show
export type UpdateShowPayload = {
  name?: string;
  startTime?: Date;
  endTime?: Date;
  metadata?: Record<string, any>;
  clientId?: string;
  studioRoomId?: string | null;
  studioId?: string | null;
  showTypeId?: string;
  showStatusId?: string;
  showStandardId?: string;
};

const showClientRelationSchema = z.object({
  uid: z.string().startsWith(ClientService.UID_PREFIX),
  name: z.string(),
});

const showStudioRelationSchema = z.object({
  uid: z.string().startsWith(StudioService.UID_PREFIX),
  name: z.string(),
});

const showStudioRoomRelationSchema = z.object({
  uid: z.string().startsWith(StudioRoomService.UID_PREFIX),
  name: z.string(),
});

const showTypeRelationSchema = z.object({
  uid: z.string().startsWith(ShowTypeService.UID_PREFIX),
  name: z.string(),
});

const showStatusRelationSchema = z.object({
  uid: z.string().startsWith(ShowStatusService.UID_PREFIX),
  name: z.string(),
  systemKey: z.string().nullable().optional(),
});

const showStandardRelationSchema = z.object({
  uid: z.string().startsWith(ShowStandardService.UID_PREFIX),
  name: z.string(),
});

const showPlatformSummaryRelationSchema = z.object({
  uid: z.string(),
  platform: z.object({
    uid: z.string(),
    name: z.string(),
  }).optional(),
});

// Internal schema for database entity
export const showSchema = z.object({
  id: z.bigint(),
  uid: z.string().startsWith(SHOW_UID_PREFIX),
  clientId: z.bigint(),
  studioId: z.bigint().nullable(),
  studioRoomId: z.bigint().nullable(),
  showTypeId: z.bigint(),
  showStatusId: z.bigint(),
  showStandardId: z.bigint(),
  name: z.string(),
  startTime: z.date(),
  endTime: z.date(),
  metadata: z.record(z.string(), z.any()),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
});

// Base object schema (no refinements) — export so orchestration schemas can call .partial() on it
export const createShowObjectSchema = z.object({
  client_id: z.string().startsWith(ClientService.UID_PREFIX), // UID
  studio_room_id: z
    .string()
    .startsWith(StudioRoomService.UID_PREFIX)
    .nullable()
    .optional(), // UID
  studio_id: z
    .string()
    .startsWith(StudioService.UID_PREFIX)
    .nullable()
    .optional(), // UID
  show_type_id: z.string().startsWith(ShowTypeService.UID_PREFIX), // UID
  show_status_id: z.string().startsWith(ShowStatusService.UID_PREFIX), // UID
  show_standard_id: z.string().startsWith(ShowStandardService.UID_PREFIX), // UID
  name: z.string().min(1, 'Show name is required'),
  start_time: z.iso.datetime(), // ISO 8601 datetime string
  end_time: z.iso.datetime(), // ISO 8601 datetime string
  metadata: z.record(z.string(), z.any()).optional(),
});

// API input schema (snake_case input, transforms to camelCase)
export const createShowSchema = createShowObjectSchema.refine(
  (data) => new Date(data.end_time) > new Date(data.start_time),
  {
    message: 'End time must be after start time',
    path: ['end_time'],
  },
);

const transformCreateShowSchema = createShowSchema.transform((data) => ({
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
}));

// API update schema (snake_case input, transforms to camelCase)
export const updateShowSchema = z
  .object({
    client_id: z.string().startsWith(ClientService.UID_PREFIX).optional(), // UID
    studio_room_id: z
      .string()
      .startsWith(StudioRoomService.UID_PREFIX)
      .nullable()
      .optional(), // UID
    studio_id: z
      .string()
      .startsWith(StudioService.UID_PREFIX)
      .nullable()
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
    studioId: data.studio_id,
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
  client: showClientRelationSchema.optional(),
  studio: showStudioRelationSchema.nullable().optional(),
  studioRoom: showStudioRoomRelationSchema.nullable().optional(),
  showType: showTypeRelationSchema.optional(),
  showStatus: showStatusRelationSchema.optional(),
  showStandard: showStandardRelationSchema.optional(),
});

export const showDtoListInclude = {
  client: {
    select: {
      uid: true,
      name: true,
    },
  },
  studio: {
    select: {
      uid: true,
      name: true,
    },
  },
  studioRoom: {
    select: {
      uid: true,
      name: true,
    },
  },
  showType: {
    select: {
      uid: true,
      name: true,
    },
  },
  showStatus: {
    select: {
      uid: true,
      name: true,
      systemKey: true,
    },
  },
  showStandard: {
    select: {
      uid: true,
      name: true,
    },
  },
} as const satisfies Prisma.ShowInclude;

export const creatorShowDtoInclude = {
  client: showDtoListInclude.client,
  studioRoom: showDtoListInclude.studioRoom,
  showType: showDtoListInclude.showType,
  showStatus: showDtoListInclude.showStatus,
  showStandard: showDtoListInclude.showStandard,
} as const satisfies Prisma.ShowInclude;

export const showWithTaskSummaryInclude = {
  ...showDtoListInclude,
  showCreators: {
    where: {
      deletedAt: null,
      creator: { deletedAt: null },
    },
    include: {
      creator: {
        select: {
          uid: true,
          name: true,
          aliasName: true,
        },
      },
    },
  },
  taskTargets: {
    where: {
      deletedAt: null,
      task: { deletedAt: null },
    },
    include: {
      task: {
        select: {
          status: true,
          assigneeId: true,
        },
      },
    },
  },
} as const satisfies Prisma.ShowInclude;

export const studioShowDetailInclude = {
  ...showDtoListInclude,
  showPlatforms: {
    where: { deletedAt: null },
    include: {
      platform: {
        select: {
          uid: true,
          name: true,
        },
      },
    },
  },
} as const satisfies Prisma.ShowInclude;

// Shared transform: DB entity with relations → snake_case API fields
function transformShowToApi(obj: z.output<typeof showWithRelationsSchema>) {
  return {
    id: obj.uid,
    name: obj.name,
    client_id: obj.client?.uid ?? null,
    client_name: obj.client?.name ?? null,
    studio_id: obj.studio?.uid ?? null,
    studio_name: obj.studio?.name ?? null,
    studio_room_id: obj.studioRoom?.uid ?? null,
    studio_room_name: obj.studioRoom?.name ?? null,
    show_type_id: obj.showType?.uid ?? null,
    show_type_name: obj.showType?.name ?? null,
    show_status_id: obj.showStatus?.uid ?? null,
    show_status_name: obj.showStatus?.name ?? null,
    show_status_system_key: obj.showStatus?.systemKey ?? null,
    show_standard_id: obj.showStandard?.uid ?? null,
    show_standard_name: obj.showStandard?.name ?? null,
    start_time: obj.startTime.toISOString(),
    end_time: obj.endTime.toISOString(),
    metadata: obj.metadata,
    created_at: obj.createdAt.toISOString(),
    updated_at: obj.updatedAt.toISOString(),
  };
}

// API output schema (transforms to snake_case)
// Uses shared schema from @eridu/api-types for consistency
export const showDto = showWithRelationsSchema
  .transform(transformShowToApi)
  .pipe(showApiResponseSchema);

export const studioShowDetailDto = showWithRelationsSchema
  .extend({
    showPlatforms: z.array(showPlatformSummaryRelationSchema).optional(),
  })
  .transform((obj) => {
    const base = transformShowToApi(obj);
    const platforms = (obj.showPlatforms ?? []).map((item) => ({
      id: item.platform?.uid ?? item.uid,
      name: item.platform?.name ?? '',
    }));
    return { ...base, platforms };
  })
  // Zod 4 .extend() schemas lose pipe-compatibility due to internal branded types.
  // The transform output is structurally validated by studioShowDetailSchema at runtime.
  .pipe(studioShowDetailSchema as any) as z.ZodPipe<any, typeof studioShowDetailSchema>;

export const listShowsFilterSchema = z.object({
  name: z.string().optional(),
  client_name: z.string().optional(),
  creator_name: z.string().optional(),
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
  id: z.string().optional(),
  show_standard_name: z.string().optional(),
  show_status_name: z.string().optional(),
  platform_name: z.string().optional(),
});

export const listShowsQuerySchema = paginationQuerySchema
  .and(listShowsFilterSchema)
  .transform((data) => ({
    ...data,
    uid: data.id,
  }));

export class ListShowsQueryDto extends createZodDto(listShowsQuerySchema) {
  declare page: number;
  declare limit: number;
  declare take: number;
  declare skip: number;
  declare sort: 'asc' | 'desc';
  declare name?: string;
  declare client_name?: string;
  declare creator_name?: string;
  declare client_id?: string | string[];
  declare start_date_from?: string;
  declare start_date_to?: string;
  declare end_date_from?: string;
  declare end_date_to?: string;
  declare order_by: 'created_at' | 'updated_at' | 'start_time' | 'end_time';
  declare order_direction: 'asc' | 'desc';
  declare include_deleted: boolean;
  declare uid: string | undefined;
  declare show_standard_name?: string;
  declare show_status_name?: string;
  declare platform_name?: string;
}

// DTOs for input/output
export class CreateShowDto extends createZodDto(transformCreateShowSchema) {}
export class UpdateShowDto extends createZodDto(updateShowSchema) {}
export class ShowDto extends createZodDto(showDto) {}
export class StudioShowDetailDto extends createZodDto(studioShowDetailDto) {}
const createStudioShowTransformSchema = createStudioShowInputSchema.transform((data) => ({
  externalId: data.external_id,
  clientId: data.client_id,
  showTypeId: data.show_type_id,
  showStatusId: data.show_status_id,
  showStandardId: data.show_standard_id,
  studioRoomId: data.studio_room_id,
  name: data.name,
  startTime: new Date(data.start_time),
  endTime: new Date(data.end_time),
  metadata: data.metadata,
  platformIds: data.platform_ids,
}));
export class CreateStudioShowDto extends createZodDto(createStudioShowTransformSchema) {
  declare externalId: string | undefined;
  declare clientId: string;
  declare showTypeId: string;
  declare showStatusId: string;
  declare showStandardId: string;
  declare studioRoomId: string | null | undefined;
  declare name: string;
  declare startTime: Date;
  declare endTime: Date;
  declare metadata: Record<string, any> | undefined;
  declare platformIds: string[];
}

const updateStudioShowTransformSchema = updateStudioShowInputSchema.transform((data) => ({
  name: data.name,
  startTime: data.start_time ? new Date(data.start_time) : undefined,
  endTime: data.end_time ? new Date(data.end_time) : undefined,
  clientId: data.client_id,
  showTypeId: data.show_type_id,
  showStatusId: data.show_status_id,
  showStandardId: data.show_standard_id,
  studioRoomId: data.studio_room_id,
  metadata: data.metadata,
  platformIds: data.platform_ids,
}));
export class UpdateStudioShowDto extends createZodDto(updateStudioShowTransformSchema) {
  declare name: string | undefined;
  declare startTime: Date | undefined;
  declare endTime: Date | undefined;
  declare clientId: string | undefined;
  declare showTypeId: string | undefined;
  declare showStatusId: string | undefined;
  declare showStandardId: string | undefined;
  declare studioRoomId: string | null | undefined;
  declare metadata: Record<string, any> | undefined;
  declare platformIds: string[] | undefined;
}
