import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { z } from 'zod';

import type {
  listShowsQuerySchema,
  showListResponseSchema,
} from '@eridu/api-types/shows';

import { apiRequest } from '@/lib/api';
import { queryKeys } from '@/lib/api/query-keys';

type ListShowsParams = z.infer<typeof listShowsQuerySchema>;
type ShowListResponse = z.infer<typeof showListResponseSchema>;

/**
 * Fetch shows list for current user with pagination and filters
 */
async function fetchShows(params: ListShowsParams): Promise<ShowListResponse> {
  return apiRequest<ShowListResponse>({
    method: 'GET',
    url: '/me/shows',
    params,
  });
}

/**
 * Hook: useShows
 *
 * Fetches paginated list of shows assigned to the current user
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useShows({
 *   page: 1,
 *   limit: 10,
 * });
 * ```
 */
export function useShows(params: ListShowsParams) {
  return useQuery({
    queryKey: queryKeys.shows.list(params),
    queryFn: () => fetchShows(params),
    placeholderData: keepPreviousData,
  });
}
