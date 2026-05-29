import { keepPreviousData, useQuery } from '@tanstack/react-query';

import type { PaginatedResponse } from '@/lib/api/admin';
import { apiClient } from '@/lib/api/client';

export type ShowRunReviewCreatorException = {
  show_creator_uid: string;
  creator_name: string;
  show_name: string;
  show_start_time: string;
  status: 'LATE' | 'MISSING';
  late_minutes: number;
  reason: string | null;
};

export type ShowRunReviewViolation = {
  violation_uid: string;
  platform_name: string;
  show_name: string;
  show_start_time: string;
  violation_type: string;
  severity: string;
  reason: string;
  observed_at: string;
};

export type ShowRunReviewTask = {
  task_uid: string;
  description: string;
  status: string;
  type: string;
  show_name: string;
};

export type ShowRunReviewShow = {
  id: string;
  shows_range: string;
  actuals_completeness: string;
  status: string;
};

export type GetShowRunReviewPaginatedParams = {
  date_from: string;
  date_to: string;
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  severity?: string;
  completeness?: string;
};

export const showRunReviewPaginatedKeys = {
  creators: (studioId: string, params: GetShowRunReviewPaginatedParams) =>
    ['show-run-review-paginated-creators', studioId, params] as const,
  violations: (studioId: string, params: GetShowRunReviewPaginatedParams) =>
    ['show-run-review-paginated-violations', studioId, params] as const,
  tasks: (studioId: string, params: GetShowRunReviewPaginatedParams) =>
    ['show-run-review-paginated-tasks', studioId, params] as const,
  shows: (studioId: string, params: GetShowRunReviewPaginatedParams) =>
    ['show-run-review-paginated-shows', studioId, params] as const,
};

export async function getShowRunReviewCreators(
  studioId: string,
  params: GetShowRunReviewPaginatedParams,
): Promise<PaginatedResponse<ShowRunReviewCreatorException>> {
  const response = await apiClient.get<PaginatedResponse<ShowRunReviewCreatorException>>(
    `/studios/${studioId}/shows/run-review/creators`,
    { params },
  );
  return response.data;
}

export function useShowRunReviewCreatorsQuery(
  studioId: string,
  params: GetShowRunReviewPaginatedParams,
  enabled = true,
) {
  return useQuery({
    queryKey: showRunReviewPaginatedKeys.creators(studioId, params),
    queryFn: () => getShowRunReviewCreators(studioId, params),
    placeholderData: keepPreviousData,
    enabled,
    staleTime: 5000,
  });
}

export async function getShowRunReviewViolations(
  studioId: string,
  params: GetShowRunReviewPaginatedParams,
): Promise<PaginatedResponse<ShowRunReviewViolation>> {
  const response = await apiClient.get<PaginatedResponse<ShowRunReviewViolation>>(
    `/studios/${studioId}/shows/run-review/violations`,
    { params },
  );
  return response.data;
}

export function useShowRunReviewViolationsQuery(
  studioId: string,
  params: GetShowRunReviewPaginatedParams,
  enabled = true,
) {
  return useQuery({
    queryKey: showRunReviewPaginatedKeys.violations(studioId, params),
    queryFn: () => getShowRunReviewViolations(studioId, params),
    placeholderData: keepPreviousData,
    enabled,
    staleTime: 5000,
  });
}

export async function getShowRunReviewTasks(
  studioId: string,
  params: GetShowRunReviewPaginatedParams,
): Promise<PaginatedResponse<ShowRunReviewTask>> {
  const response = await apiClient.get<PaginatedResponse<ShowRunReviewTask>>(
    `/studios/${studioId}/shows/run-review/tasks`,
    { params },
  );
  return response.data;
}

export function useShowRunReviewTasksQuery(
  studioId: string,
  params: GetShowRunReviewPaginatedParams,
  enabled = true,
) {
  return useQuery({
    queryKey: showRunReviewPaginatedKeys.tasks(studioId, params),
    queryFn: () => getShowRunReviewTasks(studioId, params),
    placeholderData: keepPreviousData,
    enabled,
    staleTime: 5000,
  });
}

export async function getShowRunReviewShows(
  studioId: string,
  params: GetShowRunReviewPaginatedParams,
): Promise<PaginatedResponse<ShowRunReviewShow>> {
  const response = await apiClient.get<PaginatedResponse<ShowRunReviewShow>>(
    `/studios/${studioId}/shows/run-review/shows`,
    { params },
  );
  return response.data;
}

export function useShowRunReviewShowsQuery(
  studioId: string,
  params: GetShowRunReviewPaginatedParams,
  enabled = true,
) {
  return useQuery({
    queryKey: showRunReviewPaginatedKeys.shows(studioId, params),
    queryFn: () => getShowRunReviewShows(studioId, params),
    placeholderData: keepPreviousData,
    enabled,
    staleTime: 5000,
  });
}
