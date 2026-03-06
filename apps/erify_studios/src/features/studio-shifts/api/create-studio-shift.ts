import { useMutation, useQueryClient } from '@tanstack/react-query';

import { studioShiftsKeys } from './get-studio-shifts';
import type { StudioShift, StudioShiftsResponse } from './studio-shifts.types';

import { apiClient } from '@/lib/api/client';

export type CreateStudioShiftPayload = {
  user_id: string;
  date: string;
  hourly_rate?: number;
  is_duty_manager?: boolean;
  blocks: Array<{
    start_time: string;
    end_time: string;
    metadata?: Record<string, unknown>;
  }>;
};

async function createStudioShift(
  studioId: string,
  payload: CreateStudioShiftPayload,
): Promise<StudioShift> {
  const response = await apiClient.post<StudioShift>(`/studios/${studioId}/shifts`, payload);
  return response.data;
}

export function useCreateStudioShift(studioId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateStudioShiftPayload) => createStudioShift(studioId, payload),
    onSuccess: async (newShift) => {
      queryClient.setQueriesData<StudioShiftsResponse>(
        { queryKey: studioShiftsKeys.listPrefix(studioId) },
        (prev) => {
          if (!prev)
            return prev;
          return {
            ...prev,
            data: [...prev.data, newShift],
          };
        },
      );

      if (newShift.is_duty_manager) {
        queryClient.setQueryData<StudioShift>(studioShiftsKeys.dutyManager(studioId), newShift);
      }

      await queryClient.invalidateQueries({ queryKey: studioShiftsKeys.listPrefix(studioId) });
      await queryClient.invalidateQueries({ queryKey: studioShiftsKeys.dutyManager(studioId) });
    },
  });
}
