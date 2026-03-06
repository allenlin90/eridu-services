import type { z } from 'zod';

import type {
  shiftAlignmentResponseSchema,
  shiftCalendarResponseSchema,
  studioShiftApiResponseSchema,
  studioShiftBlockApiResponseSchema,
  studioShiftStatusSchema,
} from './schemas.js';

export type StudioShiftStatus = z.infer<typeof studioShiftStatusSchema>;
export type StudioShiftBlockApiResponse = z.infer<typeof studioShiftBlockApiResponseSchema>;
export type StudioShiftApiResponse = z.infer<typeof studioShiftApiResponseSchema>;
export type StudioShiftCalendarResponse = z.infer<typeof shiftCalendarResponseSchema>;
export type StudioShiftAlignmentResponse = z.infer<typeof shiftAlignmentResponseSchema>;
