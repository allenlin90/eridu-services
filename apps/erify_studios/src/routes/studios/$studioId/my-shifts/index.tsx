import { createFileRoute, Link } from '@tanstack/react-router';
import { ReceiptText } from 'lucide-react';
import { useCallback } from 'react';
import type { DateRange } from 'react-day-picker';
import { z } from 'zod';

import { Button } from '@eridu/ui';

import { PageLayout } from '@/components/layouts/page-layout';
import { MyShiftsTableCard } from '@/features/studio-shifts/components/my-shifts-table-card';
import { MyShiftsViewToggle } from '@/features/studio-shifts/components/my-shifts-view-toggle';
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

export const Route = createFileRoute('/studios/$studioId/my-shifts/')({
  validateSearch: (search) => myShiftsSearchSchema.parse(search),
  component: MyShiftsPage,
});

function MyShiftsPage() {
  const { studioId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const viewMode = search.view;

  const {
    today,
    dateRange,
    shifts,
    pagination,
    onPaginationChange,
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
      search: (previous) => updater(previous as MyShiftsRouteSearch),
      replace: options?.replace ?? true,
    });
  }, [navigate]);

  const handleDateRangeChange = useCallback((range: DateRange | undefined) => {
    const effectiveFrom = range?.from ?? new Date(`${today}T00:00:00`);
    const fallbackTo = addDays(effectiveFrom, 7);
    const effectiveTo = range?.to ?? fallbackTo;

    updateSearch((previous) => ({
      ...previous,
      page: 1,
      date_from: toLocalDateInputValue(effectiveFrom),
      date_to: toLocalDateInputValue(effectiveTo),
    }));
  }, [today, updateSearch]);

  const handleStatusChange = useCallback((status?: MyShiftStatus) => {
    updateSearch((previous) => ({
      ...previous,
      page: 1,
      status,
    }));
  }, [updateSearch]);

  return (
    <PageLayout
      title="My Shifts"
      actions={(
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link
              to="/studios/$studioId/my-shifts/compensations"
              params={{ studioId }}
            >
              <ReceiptText className="mr-2 h-4 w-4" />
              Review Compensation
            </Link>
          </Button>
          <MyShiftsViewToggle
            viewMode={viewMode}
            onViewModeChange={(mode) =>
              updateSearch((previous) => ({
                ...previous,
                view: mode,
              }), { replace: false })}
          />
        </div>
      )}
    >
      <div className="space-y-4">
        {viewMode === 'calendar'
          ? (
              <StudioShiftsCalendar
                studioId={studioId}
                queryScope="me"
              />
            )
          : (
              <MyShiftsTableCard
                search={search}
                shifts={shifts}
                pagination={pagination}
                onPaginationChange={onPaginationChange}
                dateRange={dateRange}
                isLoading={isLoadingMyShifts}
                isFetching={isFetchingMyShifts}
                onDateRangeChange={handleDateRangeChange}
                onStatusChange={handleStatusChange}
                onRefresh={() => {
                  void refetchMyShifts();
                }}
              />
            )}
      </div>
    </PageLayout>
  );
}
