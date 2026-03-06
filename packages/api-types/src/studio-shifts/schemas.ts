import { z } from 'zod';

export const studioShiftStatusSchema = z.enum(['SCHEDULED', 'COMPLETED', 'CANCELLED']);

/**
 * Metadata stored on each StudioShiftBlock.
 *
 * All fields are optional — blocks carry no required metadata at this time.
 * Extend this schema when block-level annotations are needed (e.g. break type, handover notes).
 */
export const studioShiftBlockMetadataSchema = z.object({
  /** Free-form admin note for this block, e.g. "Lunch break" or "Handover window". */
  notes: z.string().optional(),
});

/**
 * Metadata stored on a StudioShift (parent record).
 *
 * All fields are optional — shifts carry no required metadata at this time.
 * Extend this schema when shift-level annotations are needed (e.g. payroll notes, source system ID).
 */
export const studioShiftMetadataSchema = z.object({
  /** Free-form admin note for this shift, e.g. "Overtime approved by manager". */
  notes: z.string().optional(),
});

export const shiftCalendarResponseSchema = z.object({
  period: z.object({
    date_from: z.string().datetime(),
    date_to: z.string().datetime(),
  }),
  summary: z.object({
    shift_count: z.number().int().nonnegative(),
    block_count: z.number().int().nonnegative(),
    total_hours: z.number().nonnegative(),
    total_projected_cost: z.string(),
    total_calculated_cost: z.string(),
  }),
  timeline: z.array(z.object({
    date: z.string(), // ISO 8601 date string (YYYY-MM-DD)
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
          start_time: z.string().datetime(),
          end_time: z.string().datetime(),
          duration_hours: z.number().nonnegative(),
        })),
      })),
    })),
  })),
});

export const shiftAlignmentResponseSchema = z.object({
  period: z.object({
    date_from: z.string().datetime(),
    date_to: z.string().datetime(),
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
    operational_day: z.string(), // ISO 8601 date string (YYYY-MM-DD)
    segment_start: z.string().datetime(),
    segment_end: z.string().datetime(),
    duration_minutes: z.number().int().positive(),
    first_show_start: z.string().datetime(),
    last_show_end: z.string().datetime(),
  })),
  duty_manager_missing_shows: z.array(z.object({
    show_id: z.string(),
    show_name: z.string(),
    show_start: z.string().datetime(),
    show_end: z.string().datetime(),
    operational_day: z.string(), // ISO 8601 date string (YYYY-MM-DD)
  })),
  task_readiness_warnings: z.array(z.object({
    show_id: z.string(),
    show_name: z.string(),
    show_start: z.string().datetime(),
    show_end: z.string().datetime(),
    operational_day: z.string(), // ISO 8601 date string (YYYY-MM-DD)
    show_standard: z.string(),
    has_no_tasks: z.boolean(),
    unassigned_task_count: z.number().int().nonnegative(),
    missing_required_task_types: z.array(z.enum(['SETUP', 'ACTIVE', 'CLOSURE'])),
    missing_moderation_task: z.boolean(),
  })),
});

export const studioShiftBlockApiResponseSchema = z.object({
  id: z.string(),
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  metadata: studioShiftBlockMetadataSchema,
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
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
  metadata: studioShiftMetadataSchema,
  blocks: z.array(studioShiftBlockApiResponseSchema),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
