import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { AuditApiResponse } from '@eridu/api-types/audits';
import type { SignOffShowRunReviewInput } from '@eridu/api-types/shows';

import { showRunReviewSummaryKeys } from './get-show-run-review-summary';

import { apiClient } from '@/lib/api/client';

export type SignOffShowRunReviewParams = {
  studioId: string;
  data: SignOffShowRunReviewInput;
};

export async function signOffShowRunReview({
  studioId,
  data,
}: SignOffShowRunReviewParams): Promise<AuditApiResponse> {
  const response = await apiClient.post<AuditApiResponse>(
    `/studios/${studioId}/shows/run-review/sign-off`,
    data,
  );
  return response.data;
}

export function useSignOffShowRunReview(studioId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: signOffShowRunReview,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...showRunReviewSummaryKeys.all, studioId],
      });
    },
  });
}
