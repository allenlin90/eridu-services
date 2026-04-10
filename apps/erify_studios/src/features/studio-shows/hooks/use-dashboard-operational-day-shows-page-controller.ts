import { useEffect } from 'react';

import { useTableUrlState } from '@eridu/ui';

import { useDashboardOperationalDayShows } from '@/features/studio-shows/hooks/use-dashboard-operational-day-shows';

type UseDashboardOperationalDayShowsPageControllerParams = {
  studioId: string;
  dayStartIso: string;
  dayEndIso: string;
};

export function useDashboardOperationalDayShowsPageController({
  studioId,
  dayStartIso,
  dayEndIso,
}: UseDashboardOperationalDayShowsPageControllerParams) {
  const {
    pagination,
    onPaginationChange,
    setPageCount,
  } = useTableUrlState({
    from: '/studios/$studioId/dashboard',
  });

  const query = useDashboardOperationalDayShows({
    studioId,
    dayStartIso,
    dayEndIso,
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
  });

  useEffect(() => {
    if (query.response?.meta?.totalPages !== undefined) {
      setPageCount(query.response.meta.totalPages);
    }
  }, [query.response?.meta?.totalPages, setPageCount]);

  const tablePagination = query.response?.meta
    ? {
        pageIndex: query.response.meta.page - 1,
        pageSize: query.response.meta.limit,
        total: query.response.meta.total,
        pageCount: query.response.meta.totalPages,
      }
    : {
        pageIndex: pagination.pageIndex,
        pageSize: pagination.pageSize,
        total: 0,
        pageCount: 0,
      };

  return {
    ...query,
    pagination: tablePagination,
    onPaginationChange,
  };
}
