import { z } from 'zod';

import { UID_PREFIXES } from '../constants.js';
import { createPaginatedResponseSchema } from '../pagination/schemas.js';

/**
 * Schedule API Response Schema (snake_case - matches backend API output)
 */
export const scheduleApiResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  start_date: z.iso.datetime(), // ISO 8601 datetime string
  end_date: z.iso.datetime(), // ISO 8601 datetime string
  status: z.string(),
  published_at: z.string().nullable(),
  plan_document: z.record(z.string(), z.any()).optional(),
  version: z.number().int(),
  metadata: z.record(z.string(), z.any()),
  client_id: z.string().nullable(),
  client_name: z.string().nullable(),
  studio_id: z.string().nullable(),
  studio_name: z.string().nullable(),
  created_by: z.string().nullable(),
  created_by_name: z.string().nullable(),
  published_by: z.string().nullable(),
  published_by_name: z.string().nullable(),
  created_at: z.iso.datetime(), // ISO 8601 datetime string
  updated_at: z.iso.datetime(), // ISO 8601 datetime string
});

/**
 * Schedule List Response Schema
 */
export const scheduleListResponseSchema
  = createPaginatedResponseSchema(scheduleApiResponseSchema);

/**
 * Publish summary schema for continuity-safe schedule publish.
 */
export const schedulePublishSummarySchema = z
  .object({
    shows_created: z.number().int().nonnegative(),
    shows_updated: z.number().int().nonnegative(),
    shows_cancelled: z.number().int().nonnegative(),
    shows_pending_resolution: z.number().int().nonnegative(),
    shows_restored: z.number().int().nonnegative(),
    mc_links_added: z.number().int().nonnegative().optional(),
    mc_links_updated: z.number().int().nonnegative().optional(),
    mc_links_removed: z.number().int().nonnegative().optional(),
    creator_links_added: z.number().int().nonnegative().optional(),
    creator_links_updated: z.number().int().nonnegative().optional(),
    creator_links_removed: z.number().int().nonnegative().optional(),
    platform_links_added: z.number().int().nonnegative(),
    platform_links_updated: z.number().int().nonnegative(),
    platform_links_removed: z.number().int().nonnegative(),
  })
  .transform((obj) => {
    const creatorLinksAdded = obj.creator_links_added ?? obj.mc_links_added ?? 0;
    const creatorLinksUpdated = obj.creator_links_updated ?? obj.mc_links_updated ?? 0;
    const creatorLinksRemoved = obj.creator_links_removed ?? obj.mc_links_removed ?? 0;

    const mcLinksAdded = obj.mc_links_added ?? creatorLinksAdded;
    const mcLinksUpdated = obj.mc_links_updated ?? creatorLinksUpdated;
    const mcLinksRemoved = obj.mc_links_removed ?? creatorLinksRemoved;

    return {
      ...obj,
      mc_links_added: mcLinksAdded,
      mc_links_updated: mcLinksUpdated,
      mc_links_removed: mcLinksRemoved,
      creator_links_added: creatorLinksAdded,
      creator_links_updated: creatorLinksUpdated,
      creator_links_removed: creatorLinksRemoved,
    };
  })
  .pipe(
    z.object({
      shows_created: z.number().int().nonnegative(),
      shows_updated: z.number().int().nonnegative(),
      shows_cancelled: z.number().int().nonnegative(),
      shows_pending_resolution: z.number().int().nonnegative(),
      shows_restored: z.number().int().nonnegative(),
      mc_links_added: z.number().int().nonnegative(),
      mc_links_updated: z.number().int().nonnegative(),
      mc_links_removed: z.number().int().nonnegative(),
      creator_links_added: z.number().int().nonnegative(),
      creator_links_updated: z.number().int().nonnegative(),
      creator_links_removed: z.number().int().nonnegative(),
      platform_links_added: z.number().int().nonnegative(),
      platform_links_updated: z.number().int().nonnegative(),
      platform_links_removed: z.number().int().nonnegative(),
    }),
  );

/**
 * Publish schedule response envelope schema.
 */
export const publishScheduleResponseSchema = z.object({
  schedule: scheduleApiResponseSchema,
  publish_summary: schedulePublishSummarySchema,
});

/**
 * Create Schedule Input Schema (snake_case - matches API input)
 */
export const createScheduleInputSchema = z
  .object({
    name: z.string().min(1, 'Schedule name is required'),
    start_date: z.iso.datetime(), // ISO 8601 datetime string
    end_date: z.iso.datetime(), // ISO 8601 datetime string
    status: z
      .enum(['draft', 'review', 'published'])
      .default('draft'),
    plan_document: z.record(z.string(), z.any()),
    version: z.number().int().default(1),
    metadata: z.record(z.string(), z.any()).optional(),
    client_id: z.string().startsWith(UID_PREFIXES.CLIENT),
    studio_id: z.string().startsWith(UID_PREFIXES.STUDIO).optional(),
    created_by: z.string().startsWith('user'), // USER UID prefix
  })
  .refine((data) => new Date(data.end_date) > new Date(data.start_date), {
    message: 'End date must be after start date',
    path: ['end_date'],
  });

/**
 * Update Schedule Input Schema (snake_case - matches API input)
 */
export const updateScheduleInputSchema = z
  .object({
    name: z.string().min(1, 'Schedule name is required').optional(),
    start_date: z.iso.datetime().optional(), // ISO 8601 datetime string
    end_date: z.iso.datetime().optional(), // ISO 8601 datetime string
    status: z
      .enum(['draft', 'review', 'published'])
      .optional(),
    plan_document: z.record(z.string(), z.any()).optional(),
    version: z.number().int().positive(), // Required for optimistic locking
    metadata: z.record(z.string(), z.any()).optional(),
    studio_id: z.string().startsWith(UID_PREFIXES.STUDIO).nullable().optional(),
    published_by: z.string().startsWith('user').optional(), // USER UID prefix
  })
  .refine(
    (data) => {
      // Only validate if both dates are provided
      if (data.start_date && data.end_date) {
        return new Date(data.end_date) > new Date(data.start_date);
      }
      return true;
    },
    {
      message: 'End date must be after start date',
      path: ['end_date'],
    },
  );

/**
 * List Schedules Query Parameters Schema
 */
export const listSchedulesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).optional().default(10),
  name: z.string().optional(),
  client_id: z
    .union([
      z.string().startsWith(UID_PREFIXES.CLIENT),
      z.array(z.string().startsWith(UID_PREFIXES.CLIENT)),
    ])
    .optional(),
  status: z.union([z.string(), z.array(z.string())]).optional(),
  created_by: z
    .union([
      z.string().startsWith('user'),
      z.array(z.string().startsWith('user')),
    ])
    .optional(),
  published_by: z
    .union([
      z.string().startsWith('user'),
      z.array(z.string().startsWith('user')),
    ])
    .optional(),
  start_date_from: z.iso.datetime().optional(),
  start_date_to: z.iso.datetime().optional(),
  end_date_from: z.iso.datetime().optional(),
  end_date_to: z.iso.datetime().optional(),
  order_by: z
    .enum(['created_at', 'updated_at', 'start_date', 'end_date'])
    .default('created_at'),
  order_direction: z.enum(['asc', 'desc']).default('desc'),
  include_plan_document: z.coerce.boolean().default(false),
  include_deleted: z.coerce.boolean().default(false),
});
