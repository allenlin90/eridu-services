import { z } from 'zod';

import { UID_PREFIXES } from '../constants.js';
import { createPaginatedResponseSchema } from '../pagination/schemas.js';

/**
 * Common Query parameters for Performance Analytics
 */
export const performanceQuerySchema = z.object({
  start_date: z.iso.datetime(),
  end_date: z.iso.datetime(),
  client_id: z
    .union([
      z.string().startsWith(UID_PREFIXES.CLIENT),
      z.array(z.string().startsWith(UID_PREFIXES.CLIENT)),
    ])
    .optional(),
  show_type_id: z
    .union([
      z.string().startsWith(UID_PREFIXES.SHOW_TYPE),
      z.array(z.string().startsWith(UID_PREFIXES.SHOW_TYPE)),
    ])
    .optional(),
  platform_id: z
    .union([
      z.string().startsWith(UID_PREFIXES.PLATFORM),
      z.array(z.string().startsWith(UID_PREFIXES.PLATFORM)),
    ])
    .optional(),
  show_standard_id: z
    .union([
      z.string().startsWith(UID_PREFIXES.SHOW_STANDARD),
      z.array(z.string().startsWith(UID_PREFIXES.SHOW_STANDARD)),
    ])
    .optional(),
  has_performance: z.enum(['all', 'true', 'false']).optional(),
});

export type PerformanceQueryInput = z.input<typeof performanceQuerySchema>;
export type PerformanceQuery = z.infer<typeof performanceQuerySchema>;

/**
 * Query parameters for performance shows list (with pagination)
 */
export const performanceShowsQuerySchema = performanceQuerySchema.extend({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).optional().default(10),
  name: z.string().optional(),
  sort: z.string().optional(),
});

export type PerformanceShowsQueryInput = z.input<typeof performanceShowsQuerySchema>;
export type PerformanceShowsQuery = z.infer<typeof performanceShowsQuerySchema>;

/**
 * Trend data coordinates for daily performance graphs
 */
export const performanceTrendCoordinateSchema = z.object({
  date: z.string(), // YYYY-MM-DD format
  gmv: z.string(), // decimal represented as string
  views: z.number().int(),
  ctr: z.string(), // decimal represented as string
  cto: z.string(), // decimal represented as string
});

export type PerformanceTrendCoordinate = z.infer<typeof performanceTrendCoordinateSchema>;

/**
 * Response schema for performance summary aggregates
 */
export const performanceSummaryResponseSchema = z.object({
  total_gmv: z.string(), // decimal represented as string
  total_views: z.number().int(),
  avg_ctr: z.string(), // decimal represented as string
  avg_cto: z.string(), // decimal represented as string
  recorded_shows_count: z.number().int(),
  total_shows_count: z.number().int(),
  trend: z.array(performanceTrendCoordinateSchema),
  currency: z.string(),
  locale: z.string(),
});

export type PerformanceSummaryResponse = z.infer<typeof performanceSummaryResponseSchema>;

/**
 * Performance metrics at the platform-show level
 */
export const showPerformancePlatformSchema = z.object({
  show_platform_uid: z.string(),
  platform_id: z.string(), // platform uid
  platform_name: z.string(),
  gmv: z.string().nullable(), // decimal represented as string
  views: z.number().int().nullable(), // maps to viewerCount
  ctr: z.string().nullable(), // decimal represented as string
  cto: z.string().nullable(), // decimal represented as string
});

export type ShowPerformancePlatform = z.infer<typeof showPerformancePlatformSchema>;

/**
 * Performance list item representing a show and its active platforms
 */
export const showPerformanceResponseSchema = z.object({
  id: z.string(), // show uid
  name: z.string(),
  start_time: z.string(), // ISO 8601 datetime string
  end_time: z.string(), // ISO 8601 datetime string
  client_name: z.string().nullable(),
  show_type_name: z.string().nullable(),
  platforms: z.array(showPerformancePlatformSchema),
});

export type ShowPerformanceResponse = z.infer<typeof showPerformanceResponseSchema>;

/**
 * Paginated list of shows with performance metrics
 */
export const paginatedShowPerformanceResponseSchema = createPaginatedResponseSchema(
  showPerformanceResponseSchema,
);

export type PaginatedShowPerformanceResponse = z.infer<
  typeof paginatedShowPerformanceResponseSchema
>;

/**
 * Loop-level platform performance metrics
 */
export const showPerformanceLoopMetricSchema = z.object({
  show_platform_uid: z.string(),
  platform_name: z.string(),
  gmv: z.string().nullable(),
  ctr: z.string().nullable(),
  cto: z.string().nullable(),
  viewer_count: z.number().int().nullable(),
});

export type ShowPerformanceLoopMetric = z.infer<typeof showPerformanceLoopMetricSchema>;

export const showPerformanceLoopItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  durationMin: z.number().int(),
  metrics: z.array(showPerformanceLoopMetricSchema),
});

export type ShowPerformanceLoopItem = z.infer<typeof showPerformanceLoopItemSchema>;

export const showPerformanceLoopsResponseSchema = z.object({
  loops: z.array(showPerformanceLoopItemSchema),
});

export type ShowPerformanceLoopsResponse = z.infer<typeof showPerformanceLoopsResponseSchema>;
