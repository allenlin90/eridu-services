import { useMemo } from 'react';
import type { DateRange } from 'react-day-picker';

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
  const today = toLocalDateInputValue(new Date());
  const dateFrom = resolveDateParamOrDefault(search.date_from, today);
  const dateTo = resolveDateParamOrDefault(
    search.date_to,
    toLocalDateInputValue(addDays(fromLocalDateInput(dateFrom), 7)),
  );

  const myShiftsQuery = useMyShifts({
    page: search.page,
    limit: search.limit,
    studio_id: studioId,
    date_from: dateFrom,
    date_to: dateTo,
    status: search.status,
  }, {
    enabled: Boolean(studioId),
  });

  const shifts = myShiftsQuery.data?.data ?? [];
  const totalPages = myShiftsQuery.data?.meta?.totalPages ?? 1;
  const total = myShiftsQuery.data?.meta?.total ?? 0;

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
    totalPages,
    total,
    isLoadingMyShifts: myShiftsQuery.isLoading,
    isFetchingMyShifts: myShiftsQuery.isFetching,
    refetchMyShifts: myShiftsQuery.refetch,
  };
}
