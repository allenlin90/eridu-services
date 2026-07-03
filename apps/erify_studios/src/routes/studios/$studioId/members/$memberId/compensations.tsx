import { createFileRoute } from '@tanstack/react-router';
import { useMemo } from 'react';
import type { DateRange } from 'react-day-picker';
import { z } from 'zod';

import { StudioRouteGuard } from '@/components/guards/studio-route-guard';
import { useStudioMemberCompensations } from '@/features/studio-members/api/members';
import { MemberCompensationsView } from '@/features/studio-members/components/member-compensations-view';
import { addDays, defaultCompensationDateRange } from '@/features/studio-shifts/utils/shift-date.utils';
import { toLocalDateInputValue } from '@/features/studio-shifts/utils/shift-form.utils';

const memberCompensationsSearchSchema = z
  .object({
    date_from: z.iso.date().optional(),
    date_to: z.iso.date().optional(),
  })
  .transform((search) => {
    const fallback = defaultCompensationDateRange();
    return {
      date_from: search.date_from ?? fallback.date_from,
      date_to: search.date_to ?? fallback.date_to,
    };
  });

export const Route = createFileRoute('/studios/$studioId/members/$memberId/compensations')({
  component: StudioMemberCompensationsPage,
  validateSearch: (search) => memberCompensationsSearchSchema.parse(search),
});

function StudioMemberCompensationsPage() {
  const { studioId, memberId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const dateRange = useMemo<DateRange>(() => ({
    from: new Date(`${search.date_from}T00:00:00`),
    to: new Date(`${search.date_to}T00:00:00`),
  }), [search.date_from, search.date_to]);

  const query = useStudioMemberCompensations(studioId, memberId, search);

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
      routeKey="members"
      deniedTitle="Studio Settings Access Required"
      deniedDescription="Only studio admins and managers can review member compensation."
    >
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
        enableShiftDrillIn
        showChrome={false}
      />
    </StudioRouteGuard>
  );
}
