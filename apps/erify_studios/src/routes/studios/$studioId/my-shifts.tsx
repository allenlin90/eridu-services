import { createFileRoute } from '@tanstack/react-router';
import { useCallback, useEffect } from 'react';
import type { DateRange } from 'react-day-picker';
import { z } from 'zod';

import { Button } from '@eridu/ui';

import { StudioRouteGuard } from '@/components/guards/studio-route-guard';
import { MyShiftsTableCard } from '@/features/studio-shifts/components/my-shifts-table-card';
import { StudioShiftsCalendar } from '@/features/studio-shifts/components/studio-shifts-calendar';
import { useMyShiftsPageController } from '@/features/studio-shifts/hooks/use-my-shifts-page-controller';
import type {
  MyShiftsRouteSearch,
  MyShiftStatus,
} from '@/features/studio-shifts/utils/my-shifts-route-search.utils';
import { addDays } from '@/features/studio-shifts/utils/shift-date.utils';
import { toLocalDateInputValue } from '@/features/studio-shifts/utils/shift-form.utils';

const myShiftsSearchSchema = z.object({
  view: z.enum(['calendar', 'table']).catch('calendar'),
  page: z.coerce.number().int().min(1).catch(1),
  limit: z.coerce.number().int().min(10).max(100).catch(20),
  date_from: z.string().optional().catch(undefined),
  date_to: z.string().optional().catch(undefined),
  status: z.enum(['SCHEDULED', 'COMPLETED', 'CANCELLED']).optional().catch(undefined),
});

export const Route = createFileRoute('/studios/$studioId/my-shifts')({
  validateSearch: (search) => myShiftsSearchSchema.parse(search),
  component: MyShiftsRoute,
});

function MyShiftsRoute() {
  const { studioId } = Route.useParams();

  return (
    <StudioRouteGuard
      studioId={studioId}
      routeKey="myShifts"
      deniedTitle="My Shifts Access Required"
      deniedDescription="You must be a member of this studio to view personal shifts."
    >
      <MyShiftsPageContent studioId={studioId} />
    </StudioRouteGuard>
  );
}

type MyShiftsPageContentProps = {
  studioId: string;
};

function MyShiftsPageContent({ studioId }: MyShiftsPageContentProps) {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const viewMode = search.view;

  const {
    today,
    dateRange,
    shifts,
    totalPages,
    total,
    isLoadingMyShifts,
    isFetchingMyShifts,
    refetchMyShifts,
  } = useMyShiftsPageController({
    studioId,
    search,
  });

  const updateSearch = useCallback((
    updater: (previous: MyShiftsRouteSearch) => MyShiftsRouteSearch,
    options?: { replace?: boolean },
  ) => {
    void navigate({
      to: '/studios/$studioId/my-shifts',
      params: { studioId },
      search: (previous) => updater(previous as MyShiftsRouteSearch),
      replace: options?.replace ?? true,
    });
  }, [navigate, studioId]);

  useEffect(() => {
    if (search.page > totalPages && totalPages > 0) {
      updateSearch((previous) => ({
        ...previous,
        page: totalPages,
      }));
    }
  }, [search.page, totalPages, updateSearch]);

  const handleDateRangeChange = useCallback((range: DateRange | undefined) => {
    updateSearch((previous) => ({
      ...previous,
      page: 1,
      date_from: range?.from ? toLocalDateInputValue(range.from) : today,
      date_to: range?.to
        ? toLocalDateInputValue(range.to)
        : toLocalDateInputValue(addDays(new Date(), 7)),
    }));
  }, [today, updateSearch]);

  const handleStatusChange = useCallback((status?: MyShiftStatus) => {
    updateSearch((previous) => ({
      ...previous,
      page: 1,
      status,
    }));
  }, [updateSearch]);

  const handleRowsPerPageChange = useCallback((limit: number) => {
    updateSearch((previous) => ({
      ...previous,
      page: 1,
      limit,
    }));
  }, [updateSearch]);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Shifts</h1>
          <p className="text-muted-foreground">
            Read-only schedule for your assigned shift blocks.
          </p>
        </div>
        <div className="inline-flex rounded-md border bg-background p-1">
          <Button
            size="sm"
            variant={viewMode === 'calendar' ? 'default' : 'ghost'}
            onClick={() =>
              updateSearch((previous) => ({
                ...previous,
                view: 'calendar',
              }), { replace: false })}
          >
            Calendar
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'table' ? 'default' : 'ghost'}
            onClick={() =>
              updateSearch((previous) => ({
                ...previous,
                view: 'table',
              }), { replace: false })}
          >
            Table
          </Button>
        </div>
      </div>

      {viewMode === 'calendar'
        ? (
            <StudioShiftsCalendar
              studioId={studioId}
              queryScope="me"
              summaryText="Read-only view of your assigned shift blocks."
            />
          )
        : (
            <MyShiftsTableCard
              search={search}
              shifts={shifts}
              totalPages={totalPages}
              total={total}
              dateRange={dateRange}
              isLoading={isLoadingMyShifts}
              isFetching={isFetchingMyShifts}
              onDateRangeChange={handleDateRangeChange}
              onStatusChange={handleStatusChange}
              onRefresh={() => {
                void refetchMyShifts();
              }}
              onRowsPerPageChange={handleRowsPerPageChange}
              onPreviousPage={() =>
                updateSearch((previous) => ({
                  ...previous,
                  page: Math.max(1, previous.page - 1),
                }), { replace: false })}
              onNextPage={() =>
                updateSearch((previous) => ({
                  ...previous,
                  page: Math.min(totalPages, previous.page + 1),
                }), { replace: false })}
            />
          )}
    </div>
  );
}
