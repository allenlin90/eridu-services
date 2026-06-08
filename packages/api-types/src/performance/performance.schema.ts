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
 * Columns the performance shows table can be sorted by. Per-show aggregation:
 * `gmv`/`views` are summed across platforms, `ctr`/`cto` are averaged, and
 * `start_time` sorts by the show's scheduled start. The server always appends
 * `start_time:desc` as the final tie-breaker for deterministic ordering.
 */
export const PERFORMANCE_SORT_FIELDS = ['start_time', 'gmv', 'views', 'ctr', 'cto'] as const;
export type PerformanceSortField = (typeof PERFORMANCE_SORT_FIELDS)[number];
export type PerformanceSortDirection = 'asc' | 'desc';
export type PerformanceSortRule = { field: PerformanceSortField; desc: boolean };

const PERFORMANCE_SORT_FIELD_SET = new Set<string>(PERFORMANCE_SORT_FIELDS);

/**
 * Parses a comma-separated `field:direction` sort string (e.g.
 * `gmv:desc,ctr:asc`) into structured rules, preserving priority order. Empty
 * segments are skipped. Returns `null` if any segment names an unknown field or
 * a direction other than `asc`/`desc`, so the schema can reject it with a 400.
 */
export function parsePerformanceSort(value: string): PerformanceSortRule[] | null {
  const rules: PerformanceSortRule[] = [];
  for (const segment of value.split(',')) {
    const trimmed = segment.trim();
    if (trimmed === '') {
      continue;
    }
    const [field, direction] = trimmed.split(':');
    if (field === undefined || !PERFORMANCE_SORT_FIELD_SET.has(field) || (direction !== 'asc' && direction !== 'desc')) {
      return null;
    }
    rules.push({ field: field as PerformanceSortField, desc: direction === 'desc' });
  }
  return rules;
}

/**
 * `sort` query parameter: comma-separated `<field>:<asc|desc>` pairs applied in
 * priority order, e.g. `?sort=gmv:desc,ctr:asc`. Validates field names and
 * directions at the boundary and transforms the raw string into typed rules.
 */
export const performanceSortSchema = z
  .string()
  .transform((value, ctx) => {
    const rules = parsePerformanceSort(value);
    if (rules === null) {
      ctx.addIssue({
        code: 'custom',
        message: `Invalid sort. Use comma-separated <field>:<asc|desc> pairs where field is one of: ${PERFORMANCE_SORT_FIELDS.join(', ')}.`,
      });
      return z.NEVER;
    }
    return rules;
  })
  .describe(`Comma-separated <field>:<asc|desc> sort pairs. Allowed fields: ${PERFORMANCE_SORT_FIELDS.join(', ')}. Example: gmv:desc,ctr:asc`);

/**
 * Query parameters for performance shows list (with pagination)
 */
export const performanceShowsQuerySchema = performanceQuerySchema.extend({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).optional().default(10),
  name: z.string().optional(),
  sort: performanceSortSchema.optional(),
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
 * A single point on the "By Show" performance graph: one show plotted on the
 * x-axis with its show-level GMV / view aggregates and the **peak** CTR / CTO
 * reached across the show's moderation loops (max over loops × platforms), as
 * opposed to the last-value `ShowPlatform.ctr/cto` columns. `null` when the show
 * has no recorded value / no finalized loop-bearing task for that metric.
 */
export const showPerformanceSeriesItemSchema = z.object({
  id: z.string(), // show uid
  name: z.string(),
  start_time: z.string(), // ISO 8601 datetime string
  gmv: z.string().nullable(), // summed across platforms, decimal string
  views: z.number().int().nullable(), // summed across platforms
  peak_ctr: z.string().nullable(), // max across loops × platforms, decimal string
  peak_cto: z.string().nullable(), // max across loops × platforms, decimal string
});

export type ShowPerformanceSeriesItem = z.infer<typeof showPerformanceSeriesItemSchema>;

/**
 * Response for the per-show "By Show" graph mode: all shows matching the query
 * (no pagination) ordered by `start_time` ascending, so the frontend can plot
 * them chronologically on the x-axis.
 */
export const showPerformanceSeriesResponseSchema = z.object({
  shows: z.array(showPerformanceSeriesItemSchema),
  currency: z.string(),
  locale: z.string(),
});

export type ShowPerformanceSeriesResponse = z.infer<typeof showPerformanceSeriesResponseSchema>;

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
  currency: z.string().optional(),
  locale: z.string().optional(),
});

export type ShowPerformanceLoopsResponse = z.infer<typeof showPerformanceLoopsResponseSchema>;
