import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { CorrectShowPlatformPerformanceInput, StudioShowDetail } from '@eridu/api-types/shows';

import { studioShowKeys } from './get-studio-show';
import { studioShowsKeys } from './get-studio-shows';

import { studioPerformanceKeys } from '@/features/studio-performance/api/get-performance-summary';
import { getMutationErrorMessage } from '@/features/studio-shows/lib/get-mutation-error-message';
import { apiClient } from '@/lib/api/client';

export async function correctShowPlatformPerformance(
  studioId: string,
  showId: string,
  showPlatformUid: string,
  data: CorrectShowPlatformPerformanceInput,
): Promise<StudioShowDetail> {
  const response = await apiClient.post<StudioShowDetail>(
    `/studios/${studioId}/shows/${showId}/platforms/${showPlatformUid}/correct-performance`,
    data,
  );
  return response.data;
}

export function useCorrectShowPlatformPerformance(studioId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      showId,
      showPlatformUid,
      data,
    }: {
      showId: string;
      showPlatformUid: string;
      data: CorrectShowPlatformPerformanceInput;
    }) => correctShowPlatformPerformance(studioId, showId, showPlatformUid, data),
    onSuccess: async (show) => {
      queryClient.setQueryData(studioShowKeys.detail(studioId, show.id), show);
      queryClient.invalidateQueries({ queryKey: studioShowsKeys.listPrefix(studioId) });
      queryClient.invalidateQueries({ queryKey: studioPerformanceKeys.all });
      toast.success('Performance metrics corrected');
    },
    onError: (error) => {
      toast.error(getMutationErrorMessage(error, 'Failed to correct performance metrics'));
    },
  });
}
