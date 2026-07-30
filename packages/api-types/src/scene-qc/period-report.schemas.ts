import { z } from 'zod';

import { operationalDateSchema } from './daily-review.schemas.js';

export const SCENE_QC_PERIOD_REPORT_MAX_RANGE_DAYS = 366;

export const sceneQcPeriodReportQuerySchema = z.object({
  date_from: operationalDateSchema,
  date_to: operationalDateSchema,
}).superRefine((data, ctx) => {
  if (data.date_from > data.date_to) {
    ctx.addIssue({ code: 'custom', path: ['date_to'], message: 'date_to must be on or after date_from' });
    return;
  }
  const from = new Date(`${data.date_from}T00:00:00.000Z`);
  const to = new Date(`${data.date_to}T00:00:00.000Z`);
  const spanDays = Math.round((to.getTime() - from.getTime()) / 86_400_000);
  if (spanDays > SCENE_QC_PERIOD_REPORT_MAX_RANGE_DAYS) {
    ctx.addIssue({
      code: 'custom',
      path: ['date_to'],
      message: `date range cannot exceed ${SCENE_QC_PERIOD_REPORT_MAX_RANGE_DAYS} days`,
    });
  }
});

const sceneQcPeriodCountsSchema = z.object({
  total_count: z.number().int().min(0),
  pass_count: z.number().int().min(0),
  minor_count: z.number().int().min(0),
  fail_count: z.number().int().min(0),
});

export const sceneQcPeriodTrendSchema = sceneQcPeriodCountsSchema.extend({
  operational_date: operationalDateSchema,
});

export const sceneQcPeriodClientBreakdownSchema = sceneQcPeriodCountsSchema.extend({
  client_id: z.string(),
  client_name: z.string(),
});

export const sceneQcPeriodClientTrendSchema = sceneQcPeriodClientBreakdownSchema.extend({
  operational_date: operationalDateSchema,
});

export const sceneQcPeriodIssueBreakdownSchema = z.object({
  element_key: z.string(),
  element_label: z.string(),
  defect_key: z.string(),
  defect_label: z.string(),
  count: z.number().int().min(1),
});

export const sceneQcPeriodReportSchema = z.object({
  date_from: operationalDateSchema,
  date_to: operationalDateSchema,
  generated_at: z.iso.datetime(),
  confirmed_day_count: z.number().int().min(0),
  summary: sceneQcPeriodCountsSchema.extend({
    pass_percentage: z.number().min(0).max(100),
  }),
  trend: z.array(sceneQcPeriodTrendSchema),
  client_breakdown: z.array(sceneQcPeriodClientBreakdownSchema),
  client_trend: z.array(sceneQcPeriodClientTrendSchema),
  issue_breakdown: z.array(sceneQcPeriodIssueBreakdownSchema),
});

export type SceneQcPeriodReportQuery = z.infer<typeof sceneQcPeriodReportQuerySchema>;
export type SceneQcPeriodReport = z.infer<typeof sceneQcPeriodReportSchema>;
