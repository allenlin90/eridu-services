import { useQuery } from '@tanstack/react-query';
import type { z } from 'zod';

import {
  type showApiResponseSchema,
  showApiResponseToShow,
} from '@eridu/api-types/shows';

import { apiRequest } from '@/lib/api';
import { queryKeys } from '@/lib/api/query-keys';

type ShowResponse = z.infer<typeof showApiResponseSchema>;

/**
 * Fetch single show by ID for current user
 */
async function fetchShow(id: string): Promise<ShowResponse> {
  return apiRequest<ShowResponse>({
    method: 'GET',
    url: `/me/shows/${id}`,
  });
}

/**
 * Hook: useShow
 *
 * Fetches a single show by ID assigned to the current user
 *
 * @example
 * ```tsx
 * const { data: show, isLoading, error } = useShow('shw_123');
 * ```
 */
export function useShow(id: string) {
  return useQuery({
    queryKey: queryKeys.shows.detail(id),
    queryFn: async () => {
      const response = await fetchShow(id);
      return showApiResponseToShow(response);
    },
    enabled: !!id, // Only fetch if ID is provided
  });
}
