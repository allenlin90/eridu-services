import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { adminApi, type PaginationParams } from '@/lib/api/admin';
import type { AdminResource } from '@/lib/api/admin-resources';
import { queryKeys } from '@/lib/api/query-keys';

/**
 * Hook to list admin resources with pagination
 * @param resource - Type-safe admin resource (autocomplete in IDE)
 * @param params - Pagination and filter parameters
 */
export function useAdminList<T>(
  resource: AdminResource,
  params?: PaginationParams,
) {
  return useQuery({
    queryKey: queryKeys.admin.list(resource, params || {}),
    queryFn: () => adminApi.list<T>(resource, params),
    // Stale while revalidate strategy
    staleTime: 5 * 60 * 1000, // 5 minutes - data is considered fresh for this long
    gcTime: 30 * 60 * 1000, // 30 minutes - keep in cache for this long when inactive
    refetchOnWindowFocus: true, // Refetch when user comes back to the tab
    refetchOnMount: true, // Refetch when component mounts (if stale)
    refetchOnReconnect: true, // Refetch when network reconnects
    placeholderData: keepPreviousData,
  });
}

/**
 * Hook to get a single admin resource
 * @param resource - Type-safe admin resource (autocomplete in IDE)
 * @param id - Resource ID
 * @param options.enabled - Whether the query should be enabled
 */
export function useAdminDetail<T>(
  resource: AdminResource,
  id: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: queryKeys.admin.detail(resource, id),
    queryFn: () => adminApi.get<T>(resource, id),
    enabled: options?.enabled ?? !!id,
    // Stale while revalidate strategy
    staleTime: 5 * 60 * 1000, // 5 minutes - data is considered fresh for this long
    gcTime: 30 * 60 * 1000, // 30 minutes - keep in cache for this long when inactive
    refetchOnWindowFocus: true, // Refetch when user comes back to the tab
    refetchOnMount: true, // Refetch when component mounts (if stale)
    refetchOnReconnect: true, // Refetch when network reconnects
  });
}

/**
 * Hook to create an admin resource
 * @param resource - Type-safe admin resource (autocomplete in IDE)
 */
export function useAdminCreate<T, D>(resource: AdminResource) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: D) => adminApi.create<T, D>(resource, data),
    onSuccess: () => {
      // Invalidate list queries for this resource
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.lists(resource),
      });
    },
  });
}

/**
 * Hook to update an admin resource
 * @param resource - Type-safe admin resource (autocomplete in IDE)
 */
export function useAdminUpdate<T, D>(resource: AdminResource) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: D }) =>
      adminApi.update<T, D>(resource, id, data),
    onSuccess: (_, variables) => {
      // Invalidate both list and detail queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.lists(resource),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.detail(resource, variables.id),
      });
    },
  });
}

/**
 * Hook to delete an admin resource
 * @param resource - Type-safe admin resource (autocomplete in IDE)
 */
export function useAdminDelete(resource: AdminResource) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => adminApi.delete(resource, id),
    onSuccess: () => {
      // Invalidate list queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.lists(resource),
      });
    },
  });
}
