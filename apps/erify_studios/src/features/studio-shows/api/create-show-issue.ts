import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { CreateShowIssueInput, ShowIssueApiResponse } from '@eridu/api-types/show-issues';

import { showIssueKeys } from './get-show-issues';

import { getMutationErrorMessage } from '@/features/studio-shows/lib/get-mutation-error-message';
import { apiClient } from '@/lib/api/client';

export async function createShowIssue(
  studioId: string,
  data: CreateShowIssueInput,
): Promise<ShowIssueApiResponse> {
  const response = await apiClient.post<ShowIssueApiResponse>(
    `/studios/${studioId}/show-issues`,
    data,
  );
  return response.data;
}

export function useCreateShowIssue(studioId: string, showId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateShowIssueInput) => createShowIssue(studioId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: showIssueKeys.listPrefix(studioId, showId) });
      toast.success('Issue created');
    },
    onError: (error) => {
      toast.error(getMutationErrorMessage(error, 'Failed to create issue'));
    },
  });
}
