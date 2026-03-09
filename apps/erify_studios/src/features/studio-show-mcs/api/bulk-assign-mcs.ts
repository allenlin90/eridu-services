import { useMutation, useQueryClient } from '@tanstack/react-query';

import { showMcKeys } from './get-show-mcs';

import { apiClient } from '@/lib/api/client';

export type BulkAssignMcsInput = {
  show_ids: string[];
  mc_ids: string[];
};

export type BulkAssignMode = 'append' | 'replace';

export type BulkAssignMcsResult = {
  created: number;
  skipped: number;
  removed: number;
  errors: { show_id: string; mc_id: string; reason: string }[];
};

export async function bulkAssignMcs(
  studioId: string,
  data: BulkAssignMcsInput,
  mode: BulkAssignMode,
): Promise<BulkAssignMcsResult> {
  const path = `/studios/${studioId}/shows/mc-assignments/bulk`;
  const response = mode === 'replace'
    ? await apiClient.put<BulkAssignMcsResult>(path, data)
    : await apiClient.patch<BulkAssignMcsResult>(path, data);
  return response.data;
}

export function useBulkAssignMcs(studioId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { data: BulkAssignMcsInput; mode: BulkAssignMode }) =>
      bulkAssignMcs(studioId, params.data, params.mode),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: showMcKeys.all });
    },
  });
}
