import { useMutation, useQueryClient } from '@tanstack/react-query';

import { studioShiftsKeys } from './get-studio-shifts';
import type { StudioShift, StudioShiftsResponse } from './studio-shifts.types';

import { apiClient } from '@/lib/api/client';

export type UpdateStudioShiftPayload = {
  user_id?: string;
  date?: string;
  hourly_rate?: number;
  is_duty_manager?: boolean;
  status?: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
  blocks?: Array<{
    start_time: string;
    end_time: string;
    metadata?: Record<string, unknown>;
  }>;
};

async function updateStudioShift(
  studioId: string,
  shiftId: string,
  payload: UpdateStudioShiftPayload,
): Promise<StudioShift> {
  const response = await apiClient.patch<StudioShift>(`/studios/${studioId}/shifts/${shiftId}`, payload);
  return response.data;
}

export function useUpdateStudioShift(studioId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ shiftId, payload }: { shiftId: string; payload: UpdateStudioShiftPayload }) =>
      updateStudioShift(studioId, shiftId, payload),
    onSuccess: async (updatedShift) => {
      queryClient.setQueriesData<StudioShiftsResponse>(
        { queryKey: studioShiftsKeys.listPrefix(studioId) },
        (prev) => {
          if (!prev)
            return prev;
          return {
            ...prev,
            data: prev.data.map((shift) =>
              shift.id === updatedShift.id ? { ...shift, ...updatedShift } : shift,
            ),
          };
        },
      );

      if (updatedShift.is_duty_manager) {
        queryClient.setQueryData<StudioShift>(studioShiftsKeys.dutyManager(studioId), updatedShift);
      }

      await queryClient.invalidateQueries({ queryKey: studioShiftsKeys.listPrefix(studioId) });
      await queryClient.invalidateQueries({ queryKey: studioShiftsKeys.dutyManager(studioId) });
    },
  });
}
