import { createFileRoute } from '@tanstack/react-router';
import { useMemo } from 'react';
import type { DateRange } from 'react-day-picker';
import { z } from 'zod';

import { MemberCompensationsView } from '@/features/studio-members/components/member-compensations-view';
import { useMyShiftCompensations } from '@/features/studio-shifts/api/get-my-shift-compensations';
import { addDays } from '@/features/studio-shifts/utils/shift-date.utils';
import { toLocalDateInputValue } from '@/features/studio-shifts/utils/shift-form.utils';

function defaultDateRange() {
  const from = new Date();
  return {
    date_from: toLocalDateInputValue(from),
    date_to: toLocalDateInputValue(addDays(from, 30)),
  };
}

const myShiftCompensationsSearchSchema = z
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

export const Route = createFileRoute('/studios/$studioId/my-shifts/compensations')({
  component: MyShiftCompensationsPage,
  validateSearch: (search) => myShiftCompensationsSearchSchema.parse(search),
});

function MyShiftCompensationsPage() {
  const { studioId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const dateRange = useMemo<DateRange>(() => ({
    from: new Date(`${search.date_from}T00:00:00`),
    to: new Date(`${search.date_to}T00:00:00`),
  }), [search.date_from, search.date_to]);

  const query = useMyShiftCompensations({
    studio_id: studioId,
    date_from: search.date_from,
    date_to: search.date_to,
  });

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
    <MemberCompensationsView
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
      title="My Shift Compensations"
      description={query.data?.user_name ?? 'Review your shift compensation by date range.'}
      backLink={{
        to: '/studios/$studioId/my-shifts',
        params: { studioId },
        label: 'My Shifts',
      }}
      refreshAriaLabel="Refresh my shift compensations"
    />
  );
}
