import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { ShowCreator } from './get-show-creators';
import { showCreatorKeys } from './get-show-creators';

import { apiClient } from '@/lib/api/client';

export type AddShowCreatorInput = {
  mc_id: string;
  note?: string;
  agreed_rate?: number;
  compensation_type?: string;
  commission_rate?: number;
};

export async function addShowCreator(
  studioId: string,
  showId: string,
  data: AddShowCreatorInput,
): Promise<ShowCreator> {
  const response = await apiClient.post<ShowCreator>(
    `/studios/${studioId}/shows/${showId}/creators`,
    data,
  );
  return response.data;
}

export function useAddShowCreator(studioId: string, showId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AddShowCreatorInput) => addShowCreator(studioId, showId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: showCreatorKeys.list(studioId, showId) });
    },
  });
}
