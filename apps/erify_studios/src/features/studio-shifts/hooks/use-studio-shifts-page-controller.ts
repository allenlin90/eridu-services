import { useEffect, useMemo } from 'react';

import { useTableUrlState } from '@eridu/ui';

import { useStudioShifts } from '@/features/studio-shifts/hooks/use-studio-shifts';
import type { StudioShiftsRouteSearch } from '@/features/studio-shifts/utils/studio-shifts-route-search.utils';
import {
  buildStudioShiftsQueryParams,
  sortShiftsByFirstBlockStart,
} from '@/features/studio-shifts/utils/studio-shifts-table.utils';

type UseStudioShiftsPageControllerParams = {
  studioId: string;
  search: StudioShiftsRouteSearch;
  enabled: boolean;
};

export function useStudioShiftsPageController({
  studioId,
  search,
  enabled,
}: UseStudioShiftsPageControllerParams) {
  const {
    pagination,
    onPaginationChange,
    setPageCount,
  } = useTableUrlState({
    from: '/studios/$studioId/shifts',
  });

  const tableQueryParams = useMemo(() => buildStudioShiftsQueryParams({
    ...search,
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
  }), [pagination.pageIndex, pagination.pageSize, search]);

  const {
    data,
    isLoading,
    isFetching,
    refetch,
  } = useStudioShifts(studioId, tableQueryParams, { enabled });

  useEffect(() => {
    if (data?.meta?.totalPages !== undefined) {
      setPageCount(data.meta.totalPages);
    }
  }, [data?.meta?.totalPages, setPageCount]);

  const shifts = useMemo(() => {
    return sortShiftsByFirstBlockStart(data?.data ?? []);
  }, [data?.data]);

  const tablePagination = data?.meta
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
      };

  return {
    shifts,
    data,
    isLoading,
    isFetching,
    refetch,
    pagination: tablePagination,
    onPaginationChange,
  };
}
