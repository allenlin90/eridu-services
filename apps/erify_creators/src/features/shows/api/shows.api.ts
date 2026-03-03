import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { z } from 'zod';

import {
  type listShowsQuerySchema,
  type showApiResponseSchema,
  showApiResponseToShow,
  type showListResponseSchema,
} from '@eridu/api-types/shows';

import { apiClient } from '@/lib/api/client';

export type ListShowsParams = z.infer<typeof listShowsQuerySchema>;
export type ShowListResponse = z.infer<typeof showListResponseSchema>;
export type ShowResponse = z.infer<typeof showApiResponseSchema>;

// Query Keys following the factory pattern
export const myShowsKeys = {
  all: ['me', 'shows'] as const,
  lists: () => [...myShowsKeys.all, 'list'] as const,
  list: (filters?: Record<string, any>) => [...myShowsKeys.lists(), filters] as const,
  details: () => [...myShowsKeys.all, 'detail'] as const,
  detail: (id: string) => [...myShowsKeys.details(), id] as const,
};

/**
 * Fetch shows list for current user with pagination and filters
 */
export async function getMyShows(params: ListShowsParams): Promise<ShowListResponse> {
  const { data } = await apiClient.get<ShowListResponse>('/me/shows', {
    params,
  });
  return data;
}

/**
 * Fetch single show by ID for current user
 */
export async function getMyShow(id: string): Promise<ShowResponse> {
  const { data } = await apiClient.get<ShowResponse>(`/me/shows/${id}`);
  return data;
}

/**
 * Hook: useMyShows
 * Fetches paginated list of shows assigned to the current user
 */
export function useMyShows(params: ListShowsParams) {
  return useQuery({
    queryKey: myShowsKeys.list(params),
    queryFn: () => getMyShows(params),
    placeholderData: keepPreviousData,
  });
}

/**
 * Hook: useMyShow
 * Fetches a single show by ID assigned to the current user
 */
export function useMyShow(id: string) {
  return useQuery({
    queryKey: myShowsKeys.detail(id),
    queryFn: async () => {
      const response = await getMyShow(id);
      return showApiResponseToShow(response);
    },
    enabled: !!id,
  });
}
