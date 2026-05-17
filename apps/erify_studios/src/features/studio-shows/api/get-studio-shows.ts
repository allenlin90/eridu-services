import type { ShowWithTaskSummaryDto } from '@eridu/api-types/task-management';

import { apiClient } from '@/lib/api/client';

const SHOW_EXPORT_PAGE_SIZE = 100;
const SHOW_EXPORT_MAX_PAGES = 50;
const SHOW_EXPORT_CONCURRENCY = 4;

export const SHOW_EXPORT_MAX_RECORDS = SHOW_EXPORT_PAGE_SIZE * SHOW_EXPORT_MAX_PAGES;

export class ShowExportTooLargeError extends Error {
  readonly totalRecords: number;
  constructor(totalRecords: number) {
    super(`Show export exceeds limit of ${SHOW_EXPORT_MAX_RECORDS} records (got ${totalRecords}).`);
    this.name = 'ShowExportTooLargeError';
    this.totalRecords = totalRecords;
  }
}

export type StudioShow = ShowWithTaskSummaryDto;
export type ShowSelection = Pick<StudioShow, 'id' | 'name' | 'task_summary'>;

export const studioShowsKeys = {
  all: ['studio-shows'] as const,
  lists: () => [...studioShowsKeys.all, 'list'] as const,
  listPrefix: (studioId: string) => [...studioShowsKeys.lists(), studioId] as const,
  list: (studioId: string, filters?: unknown) => [...studioShowsKeys.lists(), studioId, filters] as const,
};

type GetStudioShowsParams = {
  page?: number;
  limit?: number;
  search?: string;
  schedule_name?: string;
  date_from?: string;
  date_to?: string;
  planning_date_from?: string;
  planning_date_to?: string;
  has_tasks?: boolean;
  has_creators?: boolean;
  needs_attention?: boolean;
  has_schedule?: boolean;
  creator_name?: string;
  client_name?: string;
  show_type_name?: string;
  show_standard_name?: string;
  show_status_name?: string;
  platform_name?: string;
  actuals_state?: 'missing' | 'complete';
};

type StudioShowsResponse = {
  data: StudioShow[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export async function getStudioShows(
  studioId: string,
  params: GetStudioShowsParams,
  options?: { signal?: AbortSignal },
): Promise<StudioShowsResponse> {
  const response = await apiClient.get<StudioShowsResponse>(`/studios/${studioId}/shows`, {
    params,
    signal: options?.signal,
  });
  return response.data;
}

export async function getAllStudioShowsForExport(
  studioId: string,
  params: Omit<GetStudioShowsParams, 'page' | 'limit'>,
  options?: { signal?: AbortSignal },
): Promise<StudioShow[]> {
  const firstPage = await getStudioShows(
    studioId,
    { ...params, page: 1, limit: SHOW_EXPORT_PAGE_SIZE },
    { signal: options?.signal },
  );

  if (firstPage.meta.total > SHOW_EXPORT_MAX_RECORDS) {
    throw new ShowExportTooLargeError(firstPage.meta.total);
  }

  if (firstPage.meta.totalPages <= 1) {
    return firstPage.data;
  }

  const remainingPages = Array.from(
    { length: firstPage.meta.totalPages - 1 },
    (_, index) => index + 2,
  );

  const results: StudioShow[] = [...firstPage.data];
  for (let i = 0; i < remainingPages.length; i += SHOW_EXPORT_CONCURRENCY) {
    if (options?.signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }
    const batch = remainingPages.slice(i, i + SHOW_EXPORT_CONCURRENCY);
    const responses = await Promise.all(
      batch.map((page) => getStudioShows(
        studioId,
        { ...params, page, limit: SHOW_EXPORT_PAGE_SIZE },
        { signal: options?.signal },
      )),
    );
    for (const response of responses) {
      results.push(...response.data);
    }
  }

  return results;
}
