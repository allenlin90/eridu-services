import { createFileRoute } from '@tanstack/react-router';
import { useMemo } from 'react';
import type { DateRange } from 'react-day-picker';
import { z } from 'zod';

import { StudioRouteGuard } from '@/components/guards/studio-route-guard';
import { useStudioCreatorCompensations } from '@/features/studio-creator-roster/api/studio-creator-roster';
import { CreatorCompensationsView } from '@/features/studio-creator-roster/components/creator-compensations-view';
import { addDays } from '@/features/studio-shifts/utils/shift-date.utils';
import { toLocalDateInputValue } from '@/features/studio-shifts/utils/shift-form.utils';

function defaultDateRange() {
  const from = new Date();
  return {
    date_from: toLocalDateInputValue(from),
    date_to: toLocalDateInputValue(addDays(from, 30)),
  };
}

const creatorCompensationsSearchSchema = z
  .object({
    date_from: z.iso.date().optional(),
    date_to: z.iso.date().optional(),
  })
  .transform((search) => {
    const fallback = defaultDateRange();
    return {
      date_from: search.date_from ?? fallback.date_from,
      date_to: search.date_to ?? fallback.date_to,
    };
  });

function endOfDay(value: Date) {
  const next = new Date(value);
  next.setHours(23, 59, 59, 999);
  return next;
}

export const Route = createFileRoute('/studios/$studioId/creators/$creatorId/compensations')({
  component: StudioCreatorCompensationsPage,
  validateSearch: (search) => creatorCompensationsSearchSchema.parse(search),
});

function StudioCreatorCompensationsPage() {
  const { studioId, creatorId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const dateRange = useMemo<DateRange>(() => ({
    from: new Date(`${search.date_from}T00:00:00`),
    to: new Date(`${search.date_to}T00:00:00`),
  }), [search.date_from, search.date_to]);

  const queryParams = useMemo(() => ({
    date_from: new Date(`${search.date_from}T00:00:00`).toISOString(),
    date_to: endOfDay(new Date(`${search.date_to}T00:00:00`)).toISOString(),
  }), [search.date_from, search.date_to]);

  const query = useStudioCreatorCompensations(studioId, creatorId, queryParams);

  const handleDateRangeChange = (range: DateRange | undefined) => {
    if (!range?.from) {
      return;
    }

    const dateFrom = toLocalDateInputValue(range.from);
    const dateTo = range.to
      ? toLocalDateInputValue(range.to)
      : toLocalDateInputValue(addDays(range.from, 30));

    void navigate({
      search: {
        date_from: dateFrom,
        date_to: dateTo,
      },
      replace: true,
    });
  };

  return (
    <StudioRouteGuard
      studioId={studioId}
      routeKey="creatorCompensations"
      deniedTitle="Creator Compensation Access Required"
      deniedDescription="Only studio admins and managers can review creator compensation."
    >
      <CreatorCompensationsView
        studioId={studioId}
        dateRange={dateRange}
        data={query.data}
        isLoading={query.isLoading}
        isFetching={query.isFetching}
        isError={query.isError}
        onDateRangeChange={handleDateRangeChange}
        onRefresh={() => {
          void query.refetch();
        }}
      />
    </StudioRouteGuard>
  );
}
