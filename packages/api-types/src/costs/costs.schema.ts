import { z } from 'zod';

import { UID_PREFIXES } from '../constants.js';
import { createPaginatedResponseSchema } from '../pagination/schemas.js';

/**
 * Common Query parameters for Costs Dashboard
 */
export const costsQuerySchema = z.object({
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
  show_standard_id: z
    .union([
      z.string().startsWith(UID_PREFIXES.SHOW_STANDARD),
      z.array(z.string().startsWith(UID_PREFIXES.SHOW_STANDARD)),
    ])
    .optional(),
});

export type CostsQueryInput = z.input<typeof costsQuerySchema>;
export type CostsQuery = z.infer<typeof costsQuerySchema>;

/**
 * Sorting for Shows breakdown
 */
export const COSTS_SHOWS_SORT_FIELDS = ['start_time', 'name', 'total_cost'] as const;
export type CostsShowsSortField = (typeof COSTS_SHOWS_SORT_FIELDS)[number];
export type CostsShowsSortRule = { field: CostsShowsSortField; desc: boolean };

const COSTS_SHOWS_SORT_FIELD_SET = new Set<string>(COSTS_SHOWS_SORT_FIELDS);

export function parseCostsShowsSort(value: string): CostsShowsSortRule[] | null {
  const rules: CostsShowsSortRule[] = [];
  for (const segment of value.split(',')) {
    const trimmed = segment.trim();
    if (trimmed === '') {
      continue;
    }
    const [field, direction] = trimmed.split(':');
    if (field === undefined || !COSTS_SHOWS_SORT_FIELD_SET.has(field) || (direction !== 'asc' && direction !== 'desc')) {
      return null;
    }
    rules.push({ field: field as CostsShowsSortField, desc: direction === 'desc' });
  }
  return rules;
}

export const costsShowsSortSchema = z
  .string()
  .transform((value, ctx) => {
    const rules = parseCostsShowsSort(value);
    if (rules === null) {
      ctx.addIssue({
        code: 'custom',
        message: `Invalid sort. Use comma-separated <field>:<asc|desc> pairs where field is one of: ${COSTS_SHOWS_SORT_FIELDS.join(', ')}.`,
      });
      return z.NEVER;
    }
    return rules;
  })
  .describe(`Comma-separated <field>:<asc|desc> sort pairs. Allowed fields: ${COSTS_SHOWS_SORT_FIELDS.join(', ')}.`);

/**
 * Query parameters for Show Costs breakdown
 */
export const costsShowsQuerySchema = costsQuerySchema.extend({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).optional().default(10),
  name: z.string().optional(),
  sort: costsShowsSortSchema.optional(),
});

export type CostsShowsQueryInput = z.input<typeof costsShowsQuerySchema>;
export type CostsShowsQuery = z.infer<typeof costsShowsQuerySchema>;

/**
 * Sorting for Shifts breakdown
 */
export const COSTS_SHIFTS_SORT_FIELDS = ['date', 'total_cost'] as const;
export type CostsShiftsSortField = (typeof COSTS_SHIFTS_SORT_FIELDS)[number];
export type CostsShiftsSortRule = { field: CostsShiftsSortField; desc: boolean };

const COSTS_SHIFTS_SORT_FIELD_SET = new Set<string>(COSTS_SHIFTS_SORT_FIELDS);

export function parseCostsShiftsSort(value: string): CostsShiftsSortRule[] | null {
  const rules: CostsShiftsSortRule[] = [];
  for (const segment of value.split(',')) {
    const trimmed = segment.trim();
    if (trimmed === '') {
      continue;
    }
    const [field, direction] = trimmed.split(':');
    if (field === undefined || !COSTS_SHIFTS_SORT_FIELD_SET.has(field) || (direction !== 'asc' && direction !== 'desc')) {
      return null;
    }
    rules.push({ field: field as CostsShiftsSortField, desc: direction === 'desc' });
  }
  return rules;
}

export const costsShiftsSortSchema = z
  .string()
  .transform((value, ctx) => {
    const rules = parseCostsShiftsSort(value);
    if (rules === null) {
      ctx.addIssue({
        code: 'custom',
        message: `Invalid sort. Use comma-separated <field>:<asc|desc> pairs where field is one of: ${COSTS_SHIFTS_SORT_FIELDS.join(', ')}.`,
      });
      return z.NEVER;
    }
    return rules;
  })
  .describe(`Comma-separated <field>:<asc|desc> sort pairs. Allowed fields: ${COSTS_SHIFTS_SORT_FIELDS.join(', ')}.`);

/**
 * Query parameters for Shift Costs breakdown
 */
export const costsShiftsQuerySchema = costsQuerySchema.extend({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).optional().default(10),
  member_name: z.string().optional(),
  // Persisted studio-membership role (lowercase `STUDIO_ROLE` value, e.g.
  // `member`/`manager`) applied to the shift operator's active membership.
  // The duty-manager case is NOT a role — it maps to `is_duty_manager` below.
  role: z.string().optional(),
  // Shift-level duty-manager flag (`StudioShift.isDutyManager`), orthogonal to
  // the operator's membership role.
  is_duty_manager: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .transform((value) => (typeof value === 'string' ? value === 'true' : value))
    .optional(),
  status: z.enum(['SCHEDULED', 'COMPLETED', 'CANCELLED']).optional(),
  sort: costsShiftsSortSchema.optional(),
});

export type CostsShiftsQueryInput = z.input<typeof costsShiftsQuerySchema>;
export type CostsShiftsQuery = z.infer<typeof costsShiftsQuerySchema>;

/**
 * Trend data coordinates for daily costs graphs
 */
export const costsTrendCoordinateSchema = z.object({
  date: z.string(), // YYYY-MM-DD (local operational day)
  show_cost: z.string(), // decimal string
  shift_cost: z.string(), // decimal string
  total_cost: z.string(), // decimal string (show_cost + shift_cost)
});

export type CostsTrendCoordinate = z.infer<typeof costsTrendCoordinateSchema>;

/**
 * Response schema for costs summary aggregates
 */
export const costsSummaryResponseSchema = z.object({
  total_cost: z.string(),
  show_cost_subtotal: z.string(),
  shift_cost_subtotal: z.string(),
  unresolved_shows_count: z.number().int(),
  total_shows_count: z.number().int(),
  unresolved_shifts_count: z.number().int(),
  total_shifts_count: z.number().int(),
  trend: z.array(costsTrendCoordinateSchema),
  currency: z.string(),
  locale: z.string(),
});

export type CostsSummaryResponse = z.infer<typeof costsSummaryResponseSchema>;

/**
 * Creator breakdown for show costs
 */
export const showCreatorCostDetailSchema = z.object({
  show_creator_uid: z.string().startsWith(UID_PREFIXES.SHOW_CREATOR),
  creator_name: z.string(),
  creator_alias_name: z.string(),
  compensation_type: z.string().nullable(),
  agreed_rate: z.string().nullable(),
  commission_rate: z.string().nullable(),
  base_amount: z.string().nullable(),
  adjustment_total: z.string(),
  total_amount: z.string().nullable(),
  unresolved_reason: z.string().nullable(),
});

export type ShowCreatorCostDetail = z.infer<typeof showCreatorCostDetailSchema>;

/**
 * Show cost item
 */
export const showCostResponseSchema = z.object({
  id: z.string().startsWith(UID_PREFIXES.SHOW), // show uid
  name: z.string(),
  start_time: z.iso.datetime(), // ISO datetime
  end_time: z.iso.datetime(), // ISO datetime
  client_name: z.string().nullable(),
  show_type_name: z.string().nullable(),
  show_standard_name: z.string().nullable(),
  creators: z.array(showCreatorCostDetailSchema),
  line_item_subtotal: z.string(),
  total_cost: z.string().nullable(), // null if any unresolved creators
  unresolved_reasons: z.array(z.string()),
  calculation_warnings: z.array(z.string()),
  actuals_source: z.string(),
});

export type ShowCostResponse = z.infer<typeof showCostResponseSchema>;

/**
 * Paginated Show Costs
 */
export const paginatedShowCostsResponseSchema = createPaginatedResponseSchema(showCostResponseSchema);

export type PaginatedShowCostsResponse = z.infer<typeof paginatedShowCostsResponseSchema>;

/**
 * Shift block cost item
 */
export const shiftBlockCostDetailSchema = z.object({
  block_uid: z.string().startsWith(UID_PREFIXES.STUDIO_SHIFT_BLOCK),
  start_time: z.iso.datetime(), // ISO datetime
  end_time: z.iso.datetime(), // ISO datetime
  actual_start_time: z.iso.datetime().nullable(),
  actual_end_time: z.iso.datetime().nullable(),
  duration_hours: z.string(),
  line_item_subtotal: z.string(),
  total_cost: z.string().nullable(),
  calculation_warnings: z.array(z.string()),
});

export type ShiftBlockCostDetail = z.infer<typeof shiftBlockCostDetailSchema>;

/**
 * Shift cost item
 */
export const shiftCostResponseSchema = z.object({
  id: z.string().startsWith(UID_PREFIXES.STUDIO_SHIFT), // shift uid
  date: z.iso.date(), // YYYY-MM-DD
  member_name: z.string(),
  member_role: z.string(),
  hourly_rate: z.string(),
  status: z.string(),
  blocks: z.array(shiftBlockCostDetailSchema),
  line_item_subtotal: z.string(),
  total_cost: z.string().nullable(),
  unresolved_reasons: z.array(z.string()),
  calculation_warnings: z.array(z.string()),
  actuals_source: z.string(),
});

export type ShiftCostResponse = z.infer<typeof shiftCostResponseSchema>;

/**
 * Paginated Shift Costs
 */
export const paginatedShiftCostsResponseSchema = createPaginatedResponseSchema(shiftCostResponseSchema);

export type PaginatedShiftCostsResponse = z.infer<typeof paginatedShiftCostsResponseSchema>;
