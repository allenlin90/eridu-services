import { z } from 'zod';

export const studioShiftStatusSchema = z.enum(['SCHEDULED', 'COMPLETED', 'CANCELLED']);

export const shiftCalendarResponseSchema = z.object({
  period: z.object({
    date_from: z.string(), // ISO 8601 datetime string
    date_to: z.string(), // ISO 8601 datetime string
  }),
  summary: z.object({
    shift_count: z.number().int().nonnegative(),
    block_count: z.number().int().nonnegative(),
    total_hours: z.number().nonnegative(),
    total_projected_cost: z.string(),
    total_calculated_cost: z.string(),
  }),
  timeline: z.array(z.object({
    date: z.string(), // ISO 8601 date string
    users: z.array(z.object({
      user_id: z.string(),
      user_name: z.string(),
      total_hours: z.number().nonnegative(),
      total_projected_cost: z.string(),
      shifts: z.array(z.object({
        shift_id: z.string(),
        status: studioShiftStatusSchema,
        is_duty_manager: z.boolean(),
        hourly_rate: z.string(),
        projected_cost: z.string(),
        calculated_cost: z.string().nullable(),
        total_hours: z.number().nonnegative(),
        blocks: z.array(z.object({
          block_id: z.string(),
          start_time: z.string(), // ISO 8601 datetime string
          end_time: z.string(), // ISO 8601 datetime string
          duration_hours: z.number().nonnegative(),
        })),
      })),
    })),
  })),
});

export const shiftAlignmentResponseSchema = z.object({
  period: z.object({
    date_from: z.string(), // ISO 8601 datetime string
    date_to: z.string(), // ISO 8601 datetime string
  }),
  summary: z.object({
    shows_checked: z.number().int().nonnegative(),
    operational_days_checked: z.number().int().nonnegative(),
    risk_show_count: z.number().int().nonnegative(),
    shows_without_duty_manager_count: z.number().int().nonnegative(),
    operational_days_without_duty_manager_count: z.number().int().nonnegative(),
    shows_without_tasks_count: z.number().int().nonnegative(),
    shows_with_unassigned_tasks_count: z.number().int().nonnegative(),
    tasks_unassigned_count: z.number().int().nonnegative(),
    shows_missing_required_tasks_count: z.number().int().nonnegative(),
    premium_shows_missing_moderation_count: z.number().int().nonnegative(),
  }),
  duty_manager_uncovered_segments: z.array(z.object({
    operational_day: z.string(), // ISO 8601 date string
    segment_start: z.string(), // ISO 8601 datetime string
    segment_end: z.string(), // ISO 8601 datetime string
    duration_minutes: z.number().int().positive(),
    first_show_start: z.string(), // ISO 8601 datetime string
    last_show_end: z.string(), // ISO 8601 datetime string
  })),
  duty_manager_missing_shows: z.array(z.object({
    show_id: z.string(),
    show_name: z.string(),
    show_start: z.string(), // ISO 8601 datetime string
    show_end: z.string(), // ISO 8601 datetime string
    operational_day: z.string(), // ISO 8601 date string
  })),
  task_readiness_warnings: z.array(z.object({
    show_id: z.string(),
    show_name: z.string(),
    show_start: z.string(), // ISO 8601 datetime string
    show_end: z.string(), // ISO 8601 datetime string
    operational_day: z.string(), // ISO 8601 date string
    show_standard: z.string(),
    has_no_tasks: z.boolean(),
    unassigned_task_count: z.number().int().nonnegative(),
    missing_required_task_types: z.array(z.enum(['SETUP', 'ACTIVE', 'CLOSURE'])),
    missing_moderation_task: z.boolean(),
  })),
});

export const studioShiftBlockApiResponseSchema = z.object({
  id: z.string(),
  start_time: z.string(), // ISO 8601 datetime string
  end_time: z.string(), // ISO 8601 datetime string
  metadata: z.record(z.string(), z.unknown()),
  created_at: z.string(), // ISO 8601 datetime string
  updated_at: z.string(), // ISO 8601 datetime string
});

export const studioShiftApiResponseSchema = z.object({
  id: z.string(),
  studio_id: z.string(),
  user_id: z.string(),
  user_name: z.string(),
  date: z.string(),
  hourly_rate: z.string(),
  projected_cost: z.string(),
  calculated_cost: z.string().nullable(),
  is_approved: z.boolean(),
  is_duty_manager: z.boolean(),
  status: studioShiftStatusSchema,
  metadata: z.record(z.string(), z.unknown()),
  blocks: z.array(studioShiftBlockApiResponseSchema),
  created_at: z.string(), // ISO 8601 datetime string
  updated_at: z.string(), // ISO 8601 datetime string
});
