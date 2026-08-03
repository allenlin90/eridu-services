import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { ShowIssueApiResponse, UpdateShowIssueInput } from '@eridu/api-types/show-issues';

import { showIssueKeys } from './get-show-issues';

import { getMutationErrorMessage } from '@/features/studio-shows/lib/get-mutation-error-message';
import { apiClient } from '@/lib/api/client';

export async function updateShowIssue(
  studioId: string,
  issueId: string,
  data: UpdateShowIssueInput,
): Promise<ShowIssueApiResponse> {
  const response = await apiClient.patch<ShowIssueApiResponse>(
    `/studios/${studioId}/show-issues/${issueId}`,
    data,
  );
  return response.data;
}

export function useUpdateShowIssue(studioId: string, showId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ issueId, data }: { issueId: string; data: UpdateShowIssueInput }) =>
      updateShowIssue(studioId, issueId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: showIssueKeys.listPrefix(studioId, showId) });
      toast.success('Issue updated');
    },
    onError: (error) => {
      toast.error(getMutationErrorMessage(error, 'Failed to update issue'));
    },
  });
}
