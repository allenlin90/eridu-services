import { z } from 'zod';

export const studioShiftStatusSchema = z.enum(['SCHEDULED', 'COMPLETED', 'CANCELLED']);

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
