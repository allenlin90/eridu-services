import { createZodDto } from 'nestjs-zod';
import z from 'zod';

// ──────────────────────────────────────────────
// Per-show economics
// ──────────────────────────────────────────────

export const showEconomicsSchema = z.object({
  show_id: z.string(),
  mc_cost: z.string(),
  shift_cost: z.string(),
  total_variable_cost: z.string(),
});

export type ShowEconomics = z.infer<typeof showEconomicsSchema>;

// ──────────────────────────────────────────────
// P&L views (grouped)
// ──────────────────────────────────────────────

export const GROUP_BY = {
  SHOW: 'show',
  SCHEDULE: 'schedule',
  CLIENT: 'client',
} as const;

export const pnlQuerySchema = z.object({
  group_by: z.enum([GROUP_BY.SHOW, GROUP_BY.SCHEDULE, GROUP_BY.CLIENT]).default(GROUP_BY.SHOW),
  date_from: z.iso.datetime().transform((value) => new Date(value)),
  date_to: z.iso.datetime().transform((value) => new Date(value)),
});

export class PnlQueryDto extends createZodDto(pnlQuerySchema) {
  declare group_by: 'show' | 'schedule' | 'client';
  declare date_from: Date;
  declare date_to: Date;
}

export const pnlGroupItemSchema = z.object({
  group_id: z.string().nullable(),
  group_name: z.string().nullable(),
  show_count: z.number().int(),
  total_mc_cost: z.string(),
  total_shift_cost: z.string(),
});

export type PnlGroupItem = z.infer<typeof pnlGroupItemSchema>;

export const pnlResponseSchema = z.object({
  items: z.array(pnlGroupItemSchema),
  summary: pnlGroupItemSchema.omit({ group_id: true, group_name: true }),
});

// ──────────────────────────────────────────────
// Performance views (grouped)
// ──────────────────────────────────────────────

export const performanceQuerySchema = z.object({
  group_by: z.enum([GROUP_BY.SHOW, GROUP_BY.SCHEDULE, GROUP_BY.CLIENT]).default(GROUP_BY.SHOW),
  date_from: z.iso.datetime().transform((value) => new Date(value)),
  date_to: z.iso.datetime().transform((value) => new Date(value)),
});

export class PerformanceQueryDto extends createZodDto(performanceQuerySchema) {
  declare group_by: 'show' | 'schedule' | 'client';
  declare date_from: Date;
  declare date_to: Date;
}

export const performanceGroupItemSchema = z.object({
  group_id: z.string().nullable(),
  group_name: z.string().nullable(),
  show_count: z.number().int(),
  total_viewer_count: z.number().int(),
});

export type PerformanceGroupItem = z.infer<typeof performanceGroupItemSchema>;

export const performanceResponseSchema = z.object({
  items: z.array(performanceGroupItemSchema),
  summary: performanceGroupItemSchema.omit({ group_id: true, group_name: true }),
});
