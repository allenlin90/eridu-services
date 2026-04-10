import { useCallback, useEffect } from 'react';

import { useTableUrlState } from '@eridu/ui';

import { useTaskReportDefinitions } from '@/features/task-reports/hooks/use-task-report-definitions';

type UseTaskReportDefinitionsPageControllerParams = {
  studioId: string;
};

export function useTaskReportDefinitionsPageController({
  studioId,
}: UseTaskReportDefinitionsPageControllerParams) {
  const {
    pagination,
    onPaginationChange,
    setPageCount,
    columnFilters,
    onColumnFiltersChange,
  } = useTableUrlState({
    from: '/studios/$studioId/task-reports/',
    searchColumnId: 'search',
  });

  const search = columnFilters.find((filter) => filter.id === 'search')?.value as string | undefined;

  const query = useTaskReportDefinitions({
    studioId,
    query: {
      page: pagination.pageIndex + 1,
      limit: pagination.pageSize,
      search,
    },
  });

  useEffect(() => {
    if (query.data?.meta?.totalPages !== undefined) {
      setPageCount(query.data.meta.totalPages);
    }
  }, [query.data?.meta?.totalPages, setPageCount]);

  const tablePagination = query.data?.meta
    ? {
        pageIndex: query.data.meta.page - 1,
        pageSize: query.data.meta.limit,
        total: query.data.meta.total,
        pageCount: query.data.meta.totalPages,
      }
    : {
        pageIndex: pagination.pageIndex,
        pageSize: pagination.pageSize,
        total: 0,
        pageCount: 0,
      };

  const handleSearchChange = useCallback((value: string | undefined) => {
    onColumnFiltersChange((previous) => {
      const withoutSearch = previous.filter((filter) => filter.id !== 'search');

      if (!value) {
        return withoutSearch;
      }

      return [...withoutSearch, { id: 'search', value }];
    });
  }, [onColumnFiltersChange]);

  return {
    ...query,
    search,
    pagination: tablePagination,
    onPaginationChange,
    onSearchChange: handleSearchChange,
  };
}
