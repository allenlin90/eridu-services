import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { getStudioShows, studioShowsKeys } from '@/features/studio-shows/api/get-studio-shows';

type UseDashboardOperationalDayShowsParams = {
  studioId: string;
  dayStartIso: string;
  dayEndIso: string;
  page: number;
  limit: number;
};

export function useDashboardOperationalDayShows({
  studioId,
  dayStartIso,
  dayEndIso,
  page,
  limit,
}: UseDashboardOperationalDayShowsParams) {
  const query = useQuery({
    queryKey: studioShowsKeys.list(studioId, {
      scope: 'dashboard-operational-day',
      page,
      limit,
      date_from: dayStartIso,
      date_to: dayEndIso,
    }),
    queryFn: () =>
      getStudioShows(studioId, {
        page,
        limit,
        date_from: dayStartIso,
        date_to: dayEndIso,
      }),
    enabled: Boolean(studioId),
    placeholderData: keepPreviousData,
  });

  const response = query.data;

  return {
    ...query,
    response,
    shows: response?.data ?? [],
    total: response?.meta?.total ?? 0,
    totalPages: response?.meta?.totalPages ?? 1,
    hasResponse: Boolean(response),
  };
}
