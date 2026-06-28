import { z } from 'zod';

import { UID_PREFIXES } from '../constants.js';
import { CREATOR_COMPENSATION_TYPE } from '../creators/schemas.js';
import { createPaginatedResponseSchema } from '../pagination/schemas.js';
import {
  defaultCommissionRateInputSchema,
  defaultRateInputSchema,
} from '../studio-creators/schemas.js';

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
  actual_start_time: z.string().nullable(), // ISO 8601 datetime string
  actual_end_time: z.string().nullable(), // ISO 8601 datetime string
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
 * Lightweight per-platform shape for the all-members shows LIST
 * (`GET /studios/:studioId/shows`). Intentionally excludes the performance
 * metrics (`gmv`/`ctr`/`cto`): the list table never renders them and those
 * facts are gated to ADMIN/MANAGER on the `/performance` surface, so the
 * all-members list must not carry them. Keep list/detail contracts separate
 * so a field added for one surface cannot leak into — or break — the other.
 */
export const showListPlatformSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  show_platform_uid: z.string(),
  live_stream_link: z.string().nullable().optional(),
  platform_show_id: z.string().nullable().optional(),
  viewer_count: z.number().int().default(0),
});

/**
 * Per-platform shape for the show DETAIL / performance surfaces, which DO
 * render the performance metrics. Do not reuse this on the lightweight list.
 */
export const studioShowPlatformSummarySchema = showListPlatformSummarySchema.extend({
  gmv: z.string().nullable().optional(),
  ctr: z.string().nullable().optional(),
  cto: z.string().nullable().optional(),
});

export const studioShowDetailSchema = showApiResponseSchema.extend({
  platforms: z.array(studioShowPlatformSummarySchema).default([]),
});

export const CANCELLATION_GATE_CONFIG = {
  show_cancellation: {
    allowedOutcomes: ['CANCELLED', 'COMPLETED'] as const,
    outcomesRequiringNoActiveTasks: ['CANCELLED'] as const,
    reasonOptions: [
      'CREATOR_UNAVAILABLE',
      'ROOM_UNAVAILABLE',
      'EQUIPMENT_FAILURE',
      'UTILITY_OUTAGE',
      'PLATFORM_ISSUE',
      'CLIENT_REQUEST',
      'OTHER',
    ] as const,
  },
  schedule_publish_removal: {
    allowedOutcomes: ['CANCELLED', 'RESTORE_PREVIOUS'] as const,
    outcomesRequiringNoActiveTasks: ['CANCELLED'] as const,
    reasonOptions: ['REMOVED_FROM_REPUBLISHED_SCHEDULE'] as const,
  },
} as const;

export type GateKind = keyof typeof CANCELLATION_GATE_CONFIG;
export type GateOutcome =
  (typeof CANCELLATION_GATE_CONFIG)[GateKind]['allowedOutcomes'][number];

const gateActorSchema = z.object({
  uid: z.string().startsWith(UID_PREFIXES.USER),
  name: z.string(),
});

export const cancellationHistoryEntrySchema = z.object({
  event: z.enum(['opened', 'resolved']),
  actor: gateActorSchema.nullable(),
  at: z.iso.datetime(),
  note: z.string().nullable(),
  outcome: z.string().nullable(),
});

export const cancelShowWithResolutionSchema = z.object({
  reason_category: z.string().min(1),
  reason_note: z.string().min(1),
  outcome: z.enum(['CANCELLED', 'COMPLETED']).optional(),
});

export const requestCancellationResolutionSchema = z.object({
  reason_category: z.string().min(1),
  reason_note: z.string().min(1),
});

export const resolveShowCancellationSchema = z.object({
  outcome: z.enum(['CANCELLED', 'COMPLETED', 'RESTORE_PREVIOUS']),
  resolution_notes: z.string().min(1),
});

export const cancellationStatusResponseSchema = z.object({
  is_pending: z.boolean(),
  gate_kind: z.enum(['show_cancellation', 'schedule_publish_removal']).nullable(),
  from_status: z.string().nullable(),
  reason_category: z.string().nullable(),
  reason_note: z.string().nullable(),
  opened_by: gateActorSchema.nullable(),
  opened_at: z.iso.datetime().nullable(),
  allowed_outcomes: z.array(z.string()),
  history: z.array(cancellationHistoryEntrySchema),
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
  studio_id: z.string().startsWith(UID_PREFIXES.STUDIO).optional(),
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
    actual_start_time: z.iso.datetime().nullable().optional(),
    actual_end_time: z.iso.datetime().nullable().optional(),
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
    actual_start_time: z.iso.datetime().nullable().optional(),
    actual_end_time: z.iso.datetime().nullable().optional(),
    metadata: z.record(z.string(), z.any()).optional(),
    creators: z
      .array(
        z.object({
          creator_id: z.string(),
          note: z.string().optional(),
          agreed_rate: defaultRateInputSchema,
          compensation_type: z
            .enum(Object.values(CREATOR_COMPENSATION_TYPE) as [string, ...string[]])
            .optional(),
          commission_rate: defaultCommissionRateInputSchema,
          override_reason: z.string().trim().min(1).max(1000).optional(),
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
  actual_start_time: z.iso.datetime().nullable().optional(),
  actual_end_time: z.iso.datetime().nullable().optional(),
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
    actual_start_time: z.iso.datetime().nullable().optional(),
    actual_end_time: z.iso.datetime().nullable().optional(),
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

/**
 * Show Run Review Summary Response Schema (PR 12.4.4)
 */
/**
 * Row schemas for the paginated `run-review/*` sub-resources. These are the
 * exact element shapes the summary endpoint already exposes (reused below so
 * the summary stays identical), so the paginated endpoints can declare the same
 * proven contract via `@ZodPaginatedResponse`.
 */
export const showRunReviewCreatorExceptionSchema = z.object({
  show_creator_uid: z.string(),
  creator_name: z.string(),
  show_name: z.string(),
  show_start_time: z.string(),
  status: z.enum(['LATE', 'MISSING']),
  late_minutes: z.number(),
  reason: z.string().nullable(),
});

export const showRunReviewViolationSchema = z.object({
  violation_uid: z.string(),
  platform_name: z.string(),
  show_name: z.string(),
  show_start_time: z.string(),
  violation_type: z.string(),
  severity: z.string(),
  reason: z.string(),
  observed_at: z.string(),
});

export const showRunReviewIncompleteTaskSchema = z.object({
  task_uid: z.string(),
  description: z.string(),
  status: z.string(),
  type: z.string(),
  show_name: z.string(),
});

/**
 * Row shape for the `run-review/shows` range view. Unlike the three above this
 * is not embedded in the summary (the summary exposes aggregate `shows` counts),
 * so it is defined here to back the paginated endpoint's response contract.
 */
export const showRunReviewShowsRangeRowSchema = z.object({
  id: z.string(),
  shows_range: z.string(),
  actuals_completeness: z.string(),
  status: z.string(),
});

export const showRunReviewSummarySchema = z.object({
  date_from: z.string(),
  date_to: z.string(),
  shows: z.object({
    total_count: z.number().int(),
    started_count: z.number().int(),
    not_started_count: z.number().int(),
    late_start_count: z.number().int(),
    missing_duration_minutes: z.number().int(),
    end_recorded_count: z.number().int(),
  }),
  creators: z.object({
    total_count: z.number().int(),
    late_count: z.number().int(),
    missing_count: z.number().int(),
    exceptions: z.array(showRunReviewCreatorExceptionSchema),
  }),
  platforms: z.object({
    active_violations_count: z.number().int(),
    violations: z.array(showRunReviewViolationSchema),
  }),
  tasks: z.object({
    incomplete_phase_checks_count: z.number().int(),
    incomplete_tasks: z.array(showRunReviewIncompleteTaskSchema),
  }),
});
