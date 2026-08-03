import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { ReopenShowIssueInput, ShowIssueApiResponse } from '@eridu/api-types/show-issues';

import { showIssueKeys } from './get-show-issues';

import { getMutationErrorMessage } from '@/features/studio-shows/lib/get-mutation-error-message';
import { apiClient } from '@/lib/api/client';

export async function reopenShowIssue(
  studioId: string,
  issueId: string,
  data: ReopenShowIssueInput,
): Promise<ShowIssueApiResponse> {
  const response = await apiClient.post<ShowIssueApiResponse>(
    `/studios/${studioId}/show-issues/${issueId}/reopen`,
    data,
  );
  return response.data;
}

export function useReopenShowIssue(studioId: string, showId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ issueId, data }: { issueId: string; data: ReopenShowIssueInput }) =>
      reopenShowIssue(studioId, issueId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: showIssueKeys.listPrefix(studioId, showId) });
      toast.success('Issue reopened');
    },
    onError: (error) => {
      toast.error(getMutationErrorMessage(error, 'Failed to reopen issue'));
    },
  });
}
