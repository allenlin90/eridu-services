import type { z } from 'zod';

import type {
  createScheduleInputSchema,
  listSchedulesQuerySchema,
  scheduleApiResponseSchema,
  scheduleListResponseSchema,
  updateScheduleInputSchema,
} from './schemas.js';

/**
 * Schedule API Response Type (snake_case)
 */
export type ScheduleApiResponse = z.infer<typeof scheduleApiResponseSchema>;

/**
 * Schedule List Response Type
 */
export type ScheduleListResponse = z.infer<typeof scheduleListResponseSchema>;

/**
 * Create Schedule Input Type
 */
export type CreateScheduleInput = z.infer<typeof createScheduleInputSchema>;

/**
 * Update Schedule Input Type
 */
export type UpdateScheduleInput = z.infer<typeof updateScheduleInputSchema>;

/**
 * List Schedules Query Parameters Type
 */
export type ListSchedulesQuery = z.infer<typeof listSchedulesQuerySchema>;
