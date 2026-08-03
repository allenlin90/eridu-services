import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { ResolveShowIssueInput, ShowIssueApiResponse } from '@eridu/api-types/show-issues';

import { showIssueKeys } from './get-show-issues';

import { getMutationErrorMessage } from '@/features/studio-shows/lib/get-mutation-error-message';
import { apiClient } from '@/lib/api/client';

export async function resolveShowIssue(
  studioId: string,
  issueId: string,
  data: ResolveShowIssueInput,
): Promise<ShowIssueApiResponse> {
  const response = await apiClient.post<ShowIssueApiResponse>(
    `/studios/${studioId}/show-issues/${issueId}/resolve`,
    data,
  );
  return response.data;
}

export function useResolveShowIssue(studioId: string, showId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ issueId, data }: { issueId: string; data: ResolveShowIssueInput }) =>
      resolveShowIssue(studioId, issueId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: showIssueKeys.listPrefix(studioId, showId) });
      toast.success('Issue resolved');
    },
    onError: (error) => {
      toast.error(getMutationErrorMessage(error, 'Failed to resolve issue'));
    },
  });
}
