import type { StudioShiftsResponse } from './studio-shifts.types';

import { apiClient } from '@/lib/api/client';

export type GetMyShiftsParams = {
  page?: number;
  limit?: number;
  id?: string;
  studio_id?: string;
  date_from?: string;
  date_to?: string;
  status?: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
  is_duty_manager?: boolean;
};

export const myShiftsKeys = {
  all: ['my-shifts'] as const,
  lists: () => [...myShiftsKeys.all, 'list'] as const,
  list: (filters?: unknown) => [...myShiftsKeys.lists(), filters] as const,
};

export async function getMyShifts(params: GetMyShiftsParams): Promise<StudioShiftsResponse> {
  const response = await apiClient.get<StudioShiftsResponse>('/me/shifts', {
    params,
  });
  return response.data;
}
