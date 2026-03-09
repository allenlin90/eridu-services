import { useMutation, useQueryClient } from '@tanstack/react-query';

import { showCreatorKeys } from './get-show-creators';

import { apiClient } from '@/lib/api/client';

export type BulkAssignCreatorsInput = {
  show_ids: string[];
  mc_ids: string[];
};

export type BulkAssignMode = 'append' | 'replace';

export type BulkAssignCreatorsResult = {
  created: number;
  skipped: number;
  removed: number;
  errors: { show_id: string; mc_id: string; reason: string }[];
};

export async function bulkAssignCreators(
  studioId: string,
  data: BulkAssignCreatorsInput,
  mode: BulkAssignMode,
): Promise<BulkAssignCreatorsResult> {
  const path = `/studios/${studioId}/shows/creator-assignments/bulk`;
  const response = mode === 'replace'
    ? await apiClient.put<BulkAssignCreatorsResult>(path, data)
    : await apiClient.patch<BulkAssignCreatorsResult>(path, data);
  return response.data;
}

export function useBulkAssignCreators(studioId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { data: BulkAssignCreatorsInput; mode: BulkAssignMode }) =>
      bulkAssignCreators(studioId, params.data, params.mode),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: showCreatorKeys.all });
    },
  });
}
