import { useEffect, useMemo } from 'react';
import type { DateRange } from 'react-day-picker';

import { useTableUrlState } from '@eridu/ui';

import { useMyShifts } from '@/features/studio-shifts/hooks/use-studio-shifts';
import type { MyShiftsRouteSearch } from '@/features/studio-shifts/utils/my-shifts-route-search.utils';
import {
  addDays,
  fromLocalDateInput,
  resolveDateParamOrDefault,
} from '@/features/studio-shifts/utils/shift-date.utils';
import { toLocalDateInputValue } from '@/features/studio-shifts/utils/shift-form.utils';

type UseMyShiftsPageControllerParams = {
  studioId: string;
  search: MyShiftsRouteSearch;
};

export function useMyShiftsPageController({
  studioId,
  search,
}: UseMyShiftsPageControllerParams) {
  const {
    pagination,
    onPaginationChange,
    setPageCount,
  } = useTableUrlState({
    from: '/studios/$studioId/my-shifts',
  });
  const today = toLocalDateInputValue(new Date());
  const dateFrom = resolveDateParamOrDefault(search.date_from, today);
  const dateTo = resolveDateParamOrDefault(
    search.date_to,
    toLocalDateInputValue(addDays(fromLocalDateInput(dateFrom), 7)),
  );

  const myShiftsQuery = useMyShifts({
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    studio_id: studioId,
    date_from: dateFrom,
    date_to: dateTo,
    status: search.status,
  }, {
    enabled: Boolean(studioId),
  });

  useEffect(() => {
    if (myShiftsQuery.data?.meta?.totalPages !== undefined) {
      setPageCount(myShiftsQuery.data.meta.totalPages);
    }
  }, [myShiftsQuery.data?.meta?.totalPages, setPageCount]);

  const shifts = myShiftsQuery.data?.data ?? [];
  const tablePagination = myShiftsQuery.data?.meta
    ? {
        pageIndex: myShiftsQuery.data.meta.page - 1,
        pageSize: myShiftsQuery.data.meta.limit,
        total: myShiftsQuery.data.meta.total,
        pageCount: myShiftsQuery.data.meta.totalPages,
      }
    : {
        pageIndex: pagination.pageIndex,
        pageSize: pagination.pageSize,
        total: 0,
        pageCount: 0,
      };

  const dateRange = useMemo<DateRange>(() => ({
    from: new Date(`${dateFrom}T00:00:00`),
    to: new Date(`${dateTo}T00:00:00`),
  }), [dateFrom, dateTo]);

  return {
    today,
    dateFrom,
    dateTo,
    dateRange,
    shifts,
    pagination: tablePagination,
    onPaginationChange,
    isLoadingMyShifts: myShiftsQuery.isLoading,
    isFetchingMyShifts: myShiftsQuery.isFetching,
    refetchMyShifts: myShiftsQuery.refetch,
  };
}
