import { useMutation, useQueryClient } from '@tanstack/react-query';

import { studioShiftsKeys } from './get-studio-shifts';

import { apiClient } from '@/lib/api/client';

async function deleteStudioShift(studioId: string, shiftId: string): Promise<void> {
  await apiClient.delete(`/studios/${studioId}/shifts/${shiftId}`);
}

export function useDeleteStudioShift(studioId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (shiftId: string) => deleteStudioShift(studioId, shiftId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: studioShiftsKeys.listPrefix(studioId) });
      await queryClient.invalidateQueries({ queryKey: studioShiftsKeys.dutyManager(studioId) });
    },
  });
}
