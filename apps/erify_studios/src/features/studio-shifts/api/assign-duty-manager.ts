import { useMutation, useQueryClient } from '@tanstack/react-query';

import { studioShiftsKeys } from './get-studio-shifts';
import type { StudioShift, StudioShiftsResponse } from './studio-shifts.types';

import { apiClient } from '@/lib/api/client';

async function assignDutyManager(
  studioId: string,
  shiftId: string,
  isDutyManager: boolean,
): Promise<StudioShift> {
  const response = await apiClient.patch<StudioShift>(
    `/studios/${studioId}/shifts/${shiftId}/duty-manager`,
    { is_duty_manager: isDutyManager },
  );
  return response.data;
}

export function useAssignDutyManager(studioId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ shiftId, isDutyManager }: { shiftId: string; isDutyManager: boolean }) =>
      assignDutyManager(studioId, shiftId, isDutyManager),
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
