import { useNavigate, useSearch } from '@tanstack/react-router';
import { useMemo } from 'react';
import type { DateRange } from 'react-day-picker';

import { useMyShowCompensations } from '@/features/compensations/api/compensations.api';
import { getInitialDateRange } from '@/features/compensations/config/compensations-search-schema';
import { useActiveStudio } from '@/lib/hooks';
import * as m from '@/paraglide/messages.js';

export function useMyCompensationsViewModel() {
  const navigate = useNavigate();
  const search = useSearch({ from: '/compensations/' });
  const { activeStudioId, activeStudio } = useActiveStudio();

  const { dateFrom: defaultFrom, dateTo: defaultTo } = getInitialDateRange();
  const hasNoDateParams = !search.dateFrom && !search.dateTo;
  const dateFrom = hasNoDateParams ? defaultFrom : search.dateFrom;
  const dateTo = hasNoDateParams ? defaultTo : search.dateTo;

  const queryParams = useMemo(() => ({
    studio_id: activeStudioId ?? '',
    date_from: dateFrom ?? '',
    date_to: dateTo ?? '',
  }), [activeStudioId, dateFrom, dateTo]);

  const isQueryEnabled = !!queryParams.studio_id && !!queryParams.date_from && !!queryParams.date_to;

  const { data, isLoading, isFetching, isError, refetch } = useMyShowCompensations(queryParams);

  const dateRange: DateRange = useMemo(() => ({
    from: dateFrom ? new Date(dateFrom) : undefined,
    to: dateTo ? new Date(dateTo) : undefined,
  }), [dateFrom, dateTo]);

  const handleDateRangeChange = (range: DateRange | undefined) => {
    const toDate = range?.to ? new Date(range.to) : undefined;
    if (toDate) {
      toDate.setHours(23, 59, 59, 999);
    }

    navigate({
      search: (prev) => ({
        ...prev,
        dateFrom: range?.from?.toISOString(),
        dateTo: toDate?.toISOString(),
      }),
    });
  };

  const description = activeStudio
    ? m['compensations.descriptionWithStudio']({ studio: activeStudio.studio.name })
    : m['compensations.descriptionDefault']();

  const shows = data?.shows ?? [];

  return {
    description,
    toolbar: {
      dateRange,
      onDateRangeChange: handleDateRangeChange,
      onRefresh: () => {
        if (isQueryEnabled) {
          void refetch();
        }
      },
      isFetching,
      isQueryEnabled,
    },
    summary: {
      isLoading,
      totalAmount: data?.total_amount ?? '0.00',
      showsCount: shows.length,
      unresolvedCount: data?.unresolved_count ?? 0,
    },
    panel: {
      isLoading,
      isError,
      isQueryEnabled,
      dateFrom,
      dateTo,
      onRetry: () => {
        if (isQueryEnabled) {
          void refetch();
        }
      },
    },
    shows,
  };
}

export type MyCompensationsViewModel = ReturnType<typeof useMyCompensationsViewModel>;
