import { z } from 'zod';

import { UID_PREFIXES } from '../constants.js';
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
  studio_room_id: z.string().nullable(),
  studio_room_name: z.string().nullable(),
  show_type_id: z.string().nullable(),
  show_type_name: z.string().nullable(),
  show_status_id: z.string().nullable(),
  show_status_name: z.string().nullable(),
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

/**
 * Show List Query Parameters Schema
 */
export const listShowsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).optional().default(10),
  name: z.string().optional(),
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
 */
export const updateShowInputSchema = z
  .object({
    client_id: z.string().startsWith(UID_PREFIXES.CLIENT).optional(),
    studio_room_id: z
      .string()
      .startsWith(UID_PREFIXES.STUDIO_ROOM)
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
