import { endOfDay, isValid, parse, startOfDay } from 'date-fns';
import { z } from 'zod';

import {
  scheduleConflictResolutionStatusSchema,
  schedulePublishImpactKindSchema,
} from '@eridu/api-types/shows';

import type { GetSchedulePublishImpactsParams } from '../api/get-schedule-publish-impacts';

export const SCHEDULE_PUBLISH_IMPACTS_PAGE_SIZES = [25, 50, 100] as const;
export const SCHEDULE_PUBLISH_IMPACTS_DEFAULT_PAGE_SIZE = 25;

export type SchedulePublishImpactsTab = 'impacts' | 'runs';

/**
 * Calendar-day URL params must hold a real 'yyyy-MM-dd' date: these values are
 * URL-editable, and `dayStartIso`/`dayEndIso` would throw a `RangeError` on an
 * unparseable value (crashing route rendering), so anything else — wrong
 * shape or an impossible date like 2026-02-31 — is discarded to `undefined`.
 */
const calendarDayParamSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  // date-fns `parse` (unlike `new Date`) rejects rolled-over days like 02-31.
  .refine((value) => isValid(parse(value, 'yyyy-MM-dd', new Date(0))))
  .optional()
  .catch(undefined);

export const schedulePublishImpactsSearchSchema = z.object({
  tab: z.enum(['impacts', 'runs']).catch('impacts'),
  // impacts tab
  page: z.coerce.number().int().min(1).optional().catch(undefined),
  page_size: z.coerce
    .number()
    .int()
    .refine((value): value is (typeof SCHEDULE_PUBLISH_IMPACTS_PAGE_SIZES)[number] =>
      SCHEDULE_PUBLISH_IMPACTS_PAGE_SIZES.includes(value as (typeof SCHEDULE_PUBLISH_IMPACTS_PAGE_SIZES)[number]))
    .optional()
    .catch(undefined),
  start_from: calendarDayParamSchema,
  start_to: calendarDayParamSchema,
  changed_from: calendarDayParamSchema,
  changed_to: calendarDayParamSchema,
  impact_kind: z.array(schedulePublishImpactKindSchema).optional().catch(undefined),
  resolution_status: z.array(scheduleConflictResolutionStatusSchema).optional().catch(undefined),
  publish_run_id: z.string().optional().catch(undefined),
  // runs tab
  runs_page: z.coerce.number().int().min(1).optional().catch(undefined),
});

export type SchedulePublishImpactsSearch = z.infer<typeof schedulePublishImpactsSearchSchema>;

/**
 * Local calendar-day filter values ('yyyy-MM-dd' from the date pickers) are
 * converted to full-day ISO instants here — never string-sliced — so the
 * range the manager picked in their local timezone is what the API filters
 * on.
 */
function dayStartIso(value: string): string {
  return startOfDay(new Date(`${value}T00:00:00`)).toISOString();
}

function dayEndIso(value: string): string {
  return endOfDay(new Date(`${value}T00:00:00`)).toISOString();
}

/** Single translation point from URL search state to impacts API query params. */
export function buildSchedulePublishImpactsQueryParams(
  search: SchedulePublishImpactsSearch,
): GetSchedulePublishImpactsParams {
  return {
    page: search.page ?? 1,
    limit: search.page_size ?? SCHEDULE_PUBLISH_IMPACTS_DEFAULT_PAGE_SIZE,
    ...(search.start_from ? { start_date_from: dayStartIso(search.start_from) } : {}),
    ...(search.start_to ? { start_date_to: dayEndIso(search.start_to) } : {}),
    ...(search.changed_from ? { changed_from: dayStartIso(search.changed_from) } : {}),
    ...(search.changed_to ? { changed_to: dayEndIso(search.changed_to) } : {}),
    ...(search.impact_kind?.length ? { impact_kind: search.impact_kind } : {}),
    ...(search.resolution_status?.length ? { resolution_status: search.resolution_status } : {}),
    ...(search.publish_run_id ? { publish_run_id: search.publish_run_id } : {}),
  };
}

/**
 * Tab switches reset the other tab's filter/page params (operations-review-
 * surface contract): the returned object is the complete next search state,
 * not a merge.
 */
export function searchForTabSwitch(tab: SchedulePublishImpactsTab): SchedulePublishImpactsSearch {
  return tab === 'runs' ? { tab: 'runs', runs_page: 1 } : { tab: 'impacts', page: 1 };
}
