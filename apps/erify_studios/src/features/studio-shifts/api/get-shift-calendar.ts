import type {
  StudioShiftCalendarQueryParams,
  StudioShiftCalendarResponse,
} from './studio-shifts.types';

import { apiClient } from '@/lib/api/client';

export const shiftCalendarKeys = {
  all: (studioId: string) => ['studio-shift-calendar', studioId] as const,
  detail: (studioId: string, params?: unknown) => [...shiftCalendarKeys.all(studioId), params] as const,
};

export async function getShiftCalendar(
  studioId: string,
  params: StudioShiftCalendarQueryParams,
): Promise<StudioShiftCalendarResponse> {
  const response = await apiClient.get<StudioShiftCalendarResponse>(
    `/studios/${studioId}/shift-calendar`,
    { params },
  );
  return response.data;
}
