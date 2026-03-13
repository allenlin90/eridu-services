import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { z } from 'zod';

import type {
  bulkAssignStudioShowCreatorsInputSchema,
  BulkAssignStudioShowCreatorsResponse,
} from '@eridu/api-types/studio-creators';

import { showCreatorsKeys } from './get-show-creators';

import { studioShowKeys } from '@/features/studio-shows/api/get-studio-show';
import { studioShowsKeys } from '@/features/studio-shows/api/get-studio-shows';
import { apiClient } from '@/lib/api/client';

export type BulkAssignShowCreatorsInput = z.infer<typeof bulkAssignStudioShowCreatorsInputSchema>;

async function bulkAssignShowCreators(
  studioId: string,
  showId: string,
  data: BulkAssignShowCreatorsInput,
): Promise<BulkAssignStudioShowCreatorsResponse> {
  const response = await apiClient.post<BulkAssignStudioShowCreatorsResponse>(
    `/studios/${studioId}/shows/${showId}/creators/bulk-assign`,
    data,
  );
  return response.data;
}

export function useBulkAssignShowCreators(studioId: string, showId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BulkAssignShowCreatorsInput) => bulkAssignShowCreators(studioId, showId, data),
    meta: {
      errorMessage: 'Failed to assign creator',
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: showCreatorsKeys.list(studioId, showId) }),
        queryClient.invalidateQueries({ queryKey: studioShowKeys.detail(studioId, showId) }),
        queryClient.invalidateQueries({ queryKey: studioShowsKeys.listPrefix(studioId) }),
      ]);
    },
  });
}
