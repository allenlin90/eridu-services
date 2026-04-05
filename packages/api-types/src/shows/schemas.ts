import { z } from 'zod';

import { UID_PREFIXES } from '../constants.js';
import { CREATOR_COMPENSATION_TYPE } from '../creators/schemas.js';
import { createPaginatedResponseSchema } from '../pagination/schemas.js';

/**
 * Show API Response Schema (snake_case - matches backend API output)
 * This is the format returned by the API endpoints
 */
export const showApiResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  client_id: z.string().nullable(),
  client_name: z.string().nullable(),
  schedule_id: z.string().nullable(),
  schedule_name: z.string().nullable(),
  studio_id: z.string().nullable(),
  studio_name: z.string().nullable(),
  studio_room_id: z.string().nullable(),
  studio_room_name: z.string().nullable(),
  show_type_id: z.string().nullable(),
  show_type_name: z.string().nullable(),
  show_status_id: z.string().nullable(),
  show_status_name: z.string().nullable(),
  show_status_system_key: z.string().nullable(),
  show_standard_id: z.string().nullable(),
  show_standard_name: z.string().nullable(),
  start_time: z.string(), // ISO 8601 datetime string
  end_time: z.string(), // ISO 8601 datetime string
  metadata: z.record(z.string(), z.any()),
  created_at: z.string(), // ISO 8601 datetime string
  updated_at: z.string(), // ISO 8601 datetime string
});

/**
 * Show List Response Schema
 * Uses the reusable pagination schema
 */
export const showListResponseSchema
  = createPaginatedResponseSchema(showApiResponseSchema);

export const studioShowPlatformSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const studioShowDetailSchema = showApiResponseSchema.extend({
  platforms: z.array(studioShowPlatformSummarySchema).default([]),
});

/**
 * Show List Query Parameters Schema
 */
export const listShowsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).optional().default(10),
  name: z.string().optional(),
  creator_name: z.string().optional(),
  client_id: z
    .union([
      z.string().startsWith(UID_PREFIXES.CLIENT),
      z.array(z.string().startsWith(UID_PREFIXES.CLIENT)),
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

/**
 * Create Show Input Schema (snake_case - matches API input)
 */
export const createShowInputSchema = z
  .object({
    client_id: z.string().startsWith(UID_PREFIXES.CLIENT),
    studio_id: z.string().startsWith(UID_PREFIXES.STUDIO).optional(),
    studio_room_id: z.string().startsWith(UID_PREFIXES.STUDIO_ROOM),
    show_type_id: z.string().startsWith(UID_PREFIXES.SHOW_TYPE),
    show_status_id: z.string().startsWith(UID_PREFIXES.SHOW_STATUS),
    show_standard_id: z.string().startsWith(UID_PREFIXES.SHOW_STANDARD),
    name: z.string().min(1, 'Show name is required'),
    start_time: z.iso.datetime(), // ISO 8601 datetime string
    end_time: z.iso.datetime(), // ISO 8601 datetime string
    metadata: z.record(z.string(), z.any()).optional(),
  })
  .refine((data) => new Date(data.end_time) > new Date(data.start_time), {
    message: 'End time must be after start time',
    path: ['end_time'],
  });

/**
 * Update Show Input Schema (snake_case - matches API input)
 *
 * Admin-path schema used by admin show-operations endpoints. Accepts nested `creators`
 * and `platforms` objects for direct assignment. For studio-scoped show updates, use
 * `updateStudioShowInputSchema` instead — the studio path uses `platform_ids` and
 * separate assignment endpoints rather than nested objects.
 */
export const updateShowInputSchema = z
  .object({
    client_id: z.string().startsWith(UID_PREFIXES.CLIENT).optional(),
    studio_id: z.string().startsWith(UID_PREFIXES.STUDIO).nullable().optional(),
    studio_room_id: z
      .string()
      .startsWith(UID_PREFIXES.STUDIO_ROOM)
      .nullable()
      .optional(),
    show_type_id: z.string().startsWith(UID_PREFIXES.SHOW_TYPE).optional(),
    show_status_id: z.string().startsWith(UID_PREFIXES.SHOW_STATUS).optional(),
    show_standard_id: z
      .string()
      .startsWith(UID_PREFIXES.SHOW_STANDARD)
      .optional(),
    name: z.string().min(1, 'Show name is required').optional(),
    start_time: z.iso.datetime().optional(), // ISO 8601 datetime string
    end_time: z.iso.datetime().optional(), // ISO 8601 datetime string
    metadata: z.record(z.string(), z.any()).optional(),
    creators: z
      .array(
        z.object({
          creator_id: z.string(),
          note: z.string().optional(),
          agreed_rate: z.coerce.number().positive().optional(),
          compensation_type: z
            .enum(Object.values(CREATOR_COMPENSATION_TYPE) as [string, ...string[]])
            .optional(),
          commission_rate: z.coerce.number().min(0).max(100).optional(),
          metadata: z.record(z.string(), z.any()).optional(),
        }),
      )
      .optional(),
    platforms: z
      .array(
        z.object({
          platform_id: z.string(),
          live_stream_link: z.string().nullable().optional(),
          platform_show_id: z.string().nullable().optional(),
          viewer_count: z.number().int().min(0).optional(),
          metadata: z.record(z.string(), z.any()).optional(),
        }),
      )
      .optional(),
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
  );

export const createStudioShowInputObjectSchema = z.object({
  external_id: z.string().min(1).optional(),
  client_id: z.string().startsWith(UID_PREFIXES.CLIENT),
  schedule_id: z.string().startsWith(UID_PREFIXES.SCHEDULE).nullable().optional(),
  show_type_id: z.string().startsWith(UID_PREFIXES.SHOW_TYPE),
  show_status_id: z.string().startsWith(UID_PREFIXES.SHOW_STATUS),
  show_standard_id: z.string().startsWith(UID_PREFIXES.SHOW_STANDARD),
  studio_room_id: z
    .string()
    .startsWith(UID_PREFIXES.STUDIO_ROOM)
    .nullable()
    .optional(),
  name: z.string().min(1, 'Show name is required'),
  start_time: z.iso.datetime(),
  end_time: z.iso.datetime(),
  metadata: z.record(z.string(), z.any()).optional(),
  platform_ids: z.array(z.string().startsWith(UID_PREFIXES.PLATFORM)).default([]),
});

/**
 * Studio create show input schema (snake_case - matches studio API input)
 */
export const createStudioShowInputSchema = createStudioShowInputObjectSchema.refine((data) => new Date(data.end_time) > new Date(data.start_time), {
  message: 'End time must be after start time',
  path: ['end_time'],
});

/**
 * Studio update show input schema (snake_case - matches studio API input)
 */
export const updateStudioShowInputSchema = z
  .object({
    name: z.string().min(1, 'Show name is required').optional(),
    start_time: z.iso.datetime().optional(),
    end_time: z.iso.datetime().optional(),
    client_id: z.string().startsWith(UID_PREFIXES.CLIENT).optional(),
    schedule_id: z.string().startsWith(UID_PREFIXES.SCHEDULE).nullable().optional(),
    show_type_id: z.string().startsWith(UID_PREFIXES.SHOW_TYPE).optional(),
    show_status_id: z.string().startsWith(UID_PREFIXES.SHOW_STATUS).optional(),
    show_standard_id: z.string().startsWith(UID_PREFIXES.SHOW_STANDARD).optional(),
    studio_room_id: z
      .string()
      .startsWith(UID_PREFIXES.STUDIO_ROOM)
      .nullable()
      .optional(),
    metadata: z.record(z.string(), z.any()).optional(),
    platform_ids: z.array(z.string().startsWith(UID_PREFIXES.PLATFORM)).optional(),
  })
  .refine(
    (data) => {
      if (data.start_time && data.end_time) {
        return new Date(data.end_time) > new Date(data.start_time);
      }
      return true;
    },
    {
      message: 'End time must be after start time',
      path: ['end_time'],
    },
  );
