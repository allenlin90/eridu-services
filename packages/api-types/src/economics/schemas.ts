import { z } from 'zod';

// ============================================================================
// Show Economics Response
// ============================================================================

export const showEconomicsResponseSchema = z.object({
  show_id: z.string(),
  show_name: z.string(),
  show_external_id: z.string().nullable(),
  start_time: z.string(), // ISO datetime
  end_time: z.string(), // ISO datetime
  client_name: z.string(),
  creator_costs: z.array(
    z.object({
      creator_id: z.string(),
      creator_name: z.string(),
      compensation_type: z.string().nullable(), // FIXED | COMMISSION | HYBRID
      agreed_rate: z.string().nullable(), // resolved rate as string
      computed_cost: z.string().nullable(), // null for COMMISSION/HYBRID
    }),
  ),
  shift_costs: z.array(
    z.object({
      shift_id: z.string(),
      user_name: z.string(),
      hourly_rate: z.string(),
      overlap_minutes: z.number(),
      attributed_cost: z.string(),
    }),
  ),
  total_creator_cost: z.string(), // sum of non-null computed_cost
  total_shift_cost: z.string(), // sum of attributed_cost
  total_cost: z.string(), // creator + shift
});

export type ShowEconomicsResponse = z.infer<typeof showEconomicsResponseSchema>;

// ============================================================================
// Grouped Economics Response
// ============================================================================

export const groupedEconomicsResponseSchema = z.object({
  groups: z.array(
    z.object({
      group_key: z.string(),
      group_label: z.string(),
      show_count: z.number(),
      total_creator_cost: z.string(),
      total_shift_cost: z.string(),
      total_cost: z.string(),
    }),
  ),
  summary: z.object({
    total_creator_cost: z.string(),
    total_shift_cost: z.string(),
    total_cost: z.string(),
    show_count: z.number(),
  }),
});

export type GroupedEconomicsResponse = z.infer<typeof groupedEconomicsResponseSchema>;

// ============================================================================
// Grouped Economics Query
// ============================================================================

export const groupedEconomicsQuerySchema = z.object({
  group_by: z.enum(['show', 'schedule', 'client']),
  date_from: z.string(), // ISO date
  date_to: z.string(), // ISO date
  client_id: z.string().optional(),
  schedule_id: z.string().optional(),
});

export type GroupedEconomicsQuery = z.infer<typeof groupedEconomicsQuerySchema>;
