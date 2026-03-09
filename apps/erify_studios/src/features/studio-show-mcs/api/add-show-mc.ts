import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { ShowMc } from './get-show-mcs';
import { showMcKeys } from './get-show-mcs';

import { apiClient } from '@/lib/api/client';

export type AddShowMcInput = {
  mc_id: string;
  note?: string;
  agreed_rate?: number;
  compensation_type?: string;
  commission_rate?: number;
};

export async function addShowMc(
  studioId: string,
  showId: string,
  data: AddShowMcInput,
): Promise<ShowMc> {
  const response = await apiClient.post<ShowMc>(
    `/studios/${studioId}/shows/${showId}/mcs`,
    data,
  );
  return response.data;
}

export function useAddShowMc(studioId: string, showId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AddShowMcInput) => addShowMc(studioId, showId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: showMcKeys.list(studioId, showId) });
    },
  });
}
