import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { z } from 'zod';

import type { updateStudioShiftBlockInputSchema } from '@eridu/api-types/studio-shifts';

import { shiftCalendarKeys } from './get-shift-calendar';
import { studioShiftsKeys } from './get-studio-shifts';
import type { StudioShift, StudioShiftsResponse } from './studio-shifts.types';

import { apiClient } from '@/lib/api/client';

export type UpdateStudioShiftBlockPayload = z.input<typeof updateStudioShiftBlockInputSchema>;

async function updateStudioShiftBlock(
  studioId: string,
  shiftId: string,
  blockId: string,
  payload: UpdateStudioShiftBlockPayload,
): Promise<StudioShift> {
  const response = await apiClient.patch<StudioShift>(
    `/studios/${studioId}/shifts/${shiftId}/blocks/${blockId}`,
    payload,
  );
  return response.data;
}

export function useUpdateStudioShiftBlock(studioId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      shiftId,
      blockId,
      payload,
    }: {
      shiftId: string;
      blockId: string;
      payload: UpdateStudioShiftBlockPayload;
    }) => updateStudioShiftBlock(studioId, shiftId, blockId, payload),
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

      await queryClient.invalidateQueries({ queryKey: studioShiftsKeys.listPrefix(studioId) });
      await queryClient.invalidateQueries({ queryKey: shiftCalendarKeys.all(studioId) });
    },
  });
}
