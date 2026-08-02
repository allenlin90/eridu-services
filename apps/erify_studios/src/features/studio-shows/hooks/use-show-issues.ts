import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo } from 'react';

import { useTableUrlState } from '@eridu/ui';

import { showIssueKeys, useShowIssuesQuery } from '../api/get-show-issues';

type UseShowIssuesProps = {
  studioId: string;
  showId: string;
};

/**
 * Feature hook for the show detail Issues tab: owns URL-synced pagination
 * and filter state (via `useTableUrlState`) and the server query. See
 * `.agents/skills/table-view-pattern` and
 * apps/erify_api/docs/SHOW_ISSUE_OWNERSHIP.md.
 */
export function useShowIssues({ studioId, showId }: UseShowIssuesProps) {
  const queryClient = useQueryClient();
  const {
    pagination,
    onPaginationChange,
    setPageCount,
    columnFilters,
    onColumnFiltersChange,
  } = useTableUrlState({
    from: '/studios/$studioId/shows/$showId/issues',
    searchColumnId: 'search',
    paramNames: { search: 'search', startDate: 'startDate', endDate: 'endDate' },
  });

  const searchValue = columnFilters.find((filter) => filter.id === 'search')?.value as string | undefined;
  const statusValue = columnFilters.find((filter) => filter.id === 'status')?.value as string | undefined;
  const severityValue = columnFilters.find((filter) => filter.id === 'severity')?.value as string | undefined;
  const categoryValue = columnFilters.find((filter) => filter.id === 'category')?.value as string | undefined;
  const ownerIdValue = columnFilters.find((filter) => filter.id === 'owner_id')?.value as string | undefined;

  const queryParams = useMemo(
    () => ({
      page: pagination.pageIndex + 1,
      limit: pagination.pageSize,
      show_id: showId,
      search: searchValue || undefined,
      status: statusValue || undefined,
      severity: severityValue || undefined,
      category: categoryValue || undefined,
      owner_id: ownerIdValue || undefined,
    }),
    [
      pagination.pageIndex,
      pagination.pageSize,
      showId,
      searchValue,
      statusValue,
      severityValue,
      categoryValue,
      ownerIdValue,
    ],
  );

  const { data, isLoading, isFetching } = useShowIssuesQuery(studioId, queryParams);

  useEffect(() => {
    if (data?.meta?.totalPages !== undefined) {
      setPageCount(data.meta.totalPages);
    }
  }, [data?.meta?.totalPages, setPageCount]);

  const handleRefresh = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: showIssueKeys.listPrefix(studioId, showId),
    });
  }, [queryClient, studioId, showId]);

  return {
    issues: data?.data ?? [],
    isLoading,
    isFetching,
    pagination: data?.meta
      ? {
          pageIndex: data.meta.page - 1,
          pageSize: data.meta.limit,
          total: data.meta.total,
          pageCount: data.meta.totalPages,
        }
      : {
          pageIndex: pagination.pageIndex,
          pageSize: pagination.pageSize,
          total: 0,
          pageCount: 0,
        },
    onPaginationChange,
    columnFilters,
    onColumnFiltersChange,
    handleRefresh,
  };
}
