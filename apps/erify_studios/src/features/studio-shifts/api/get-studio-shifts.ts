import type { StudioShift, StudioShiftsResponse } from './studio-shifts.types';

import { apiClient } from '@/lib/api/client';

const SHIFT_EXPORT_PAGE_SIZE = 100;

export type GetStudioShiftsParams = {
  page?: number;
  limit?: number;
  user_id?: string;
  date_from?: string;
  date_to?: string;
  status?: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
  is_duty_manager?: boolean;
};

export const studioShiftsKeys = {
  all: (studioId: string) => ['studio-shifts', studioId] as const,
  lists: (studioId: string) => [...studioShiftsKeys.all(studioId), 'list'] as const,
  listPrefix: (studioId: string) => [...studioShiftsKeys.lists(studioId)] as const,
  list: (studioId: string, filters?: unknown) => [...studioShiftsKeys.lists(studioId), filters] as const,
  dutyManager: (studioId: string, time?: string) => [...studioShiftsKeys.all(studioId), 'duty-manager', time] as const,
};

export async function getStudioShifts(
  studioId: string,
  params: GetStudioShiftsParams,
  options?: { signal?: AbortSignal },
): Promise<StudioShiftsResponse> {
  const response = await apiClient.get<StudioShiftsResponse>(`/studios/${studioId}/shifts`, {
    params,
    signal: options?.signal,
  });
  return response.data;
}

export async function getAllStudioShiftsForExport(
  studioId: string,
  params: Omit<GetStudioShiftsParams, 'page' | 'limit'>,
): Promise<StudioShift[]> {
  const firstPage = await getStudioShifts(studioId, {
    ...params,
    page: 1,
    limit: SHIFT_EXPORT_PAGE_SIZE,
  });
  const shifts = [...firstPage.data];

  for (let page = 2; page <= firstPage.meta.totalPages; page += 1) {
    const nextPage = await getStudioShifts(studioId, {
      ...params,
      page,
      limit: SHIFT_EXPORT_PAGE_SIZE,
    });
    shifts.push(...nextPage.data);
  }

  return shifts;
}

export async function getDutyManager(
  studioId: string,
  time?: string,
  options?: { signal?: AbortSignal },
): Promise<StudioShift | null> {
  const response = await apiClient.get<StudioShift | null>(`/studios/${studioId}/shifts/duty-manager`, {
    params: time ? { time } : undefined,
    signal: options?.signal,
  });
  return response.data;
}
