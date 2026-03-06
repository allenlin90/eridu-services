import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { z } from 'zod';

import { Button } from '@eridu/ui';

import { PageLayout } from '@/components/layouts/page-layout';
import {
  DashboardDutyCoverageCards,
  DashboardMyUpcomingShiftsCard,
} from '@/components/studio-dashboard/dashboard-coverage-cards';
import { DashboardDateNavigationCard } from '@/components/studio-dashboard/dashboard-date-navigation-card';
import {
  OperationalDayShowListCard,
  OperationalDayShowsSummaryCard,
} from '@/components/studio-dashboard/dashboard-show-sections';
import { addDays, fromLocalDateInput } from '@/features/studio-shifts/utils/shift-date.utils';
import { formatDate, toLocalDateInputValue } from '@/features/studio-shifts/utils/shift-form.utils';
import { getStudioShows } from '@/features/studio-shows/api/get-studio-shows';
import { useStudioAccess } from '@/lib/hooks/use-studio-access';

const DASHBOARD_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const dashboardSearchSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  limit: z.coerce.number().int().min(1).max(100).catch(10),
  date: z.string().regex(DASHBOARD_DATE_PATTERN).optional().catch(undefined),
});
type DashboardSearch = z.infer<typeof dashboardSearchSchema>;

const OPERATIONAL_DAY_END_HOUR = 6;
const TIME_HH_MM_FORMATTER = new Intl.DateTimeFormat('en-US', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

export const Route = createFileRoute('/studios/$studioId/dashboard')({
  component: StudioDashboardPage,
  validateSearch: (search) => dashboardSearchSchema.parse(search),
});

function formatTimeHHmm(value: string): string {
  return TIME_HH_MM_FORMATTER.format(new Date(value));
}

function StudioDashboardPage() {
  const { studioId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const timerId = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(timerId);
  }, []);

  const todayDate = toLocalDateInputValue(new Date(nowMs));
  const selectedDate = search.date ?? todayDate;
  const isSelectedToday = selectedDate === todayDate;

  const showsPage = search.page;
  const showsLimit = search.limit;
  const { hasAccess } = useStudioAccess(studioId);
  const isStudioAdmin = hasAccess('shifts');

  const dayStart = useMemo(() => fromLocalDateInput(selectedDate), [selectedDate]);
  const dayEnd = useMemo(() => {
    const next = addDays(dayStart, 1);
    next.setHours(OPERATIONAL_DAY_END_HOUR - 1, 59, 59, 999);
    return next;
  }, [dayStart]);
  const dayStartIso = dayStart.toISOString();
  const dayEndIso = dayEnd.toISOString();
  const dutyReferenceTime = isSelectedToday ? undefined : dayStartIso;

  const previewUntil = useMemo(
    () => toLocalDateInputValue(addDays(dayStart, 7)),
    [dayStart],
  );

  const {
    data: todayShowsResponse,
    isLoading: isLoadingTodayShows,
    isFetching: isFetchingTodayShows,
  } = useQuery({
    queryKey: ['studio-dashboard', studioId, 'today-shows', dayStartIso, dayEndIso, showsPage, showsLimit],
    queryFn: () =>
      getStudioShows(studioId, {
        page: showsPage,
        limit: showsLimit,
        date_from: dayStartIso,
        date_to: dayEndIso,
      }),
    enabled: Boolean(studioId),
  });

  const totalShows = todayShowsResponse?.meta?.total ?? 0;
  const totalShowPages = todayShowsResponse?.meta?.totalPages ?? 1;
  const todayShows = todayShowsResponse?.data ?? [];
  const hasShowsResponse = Boolean(todayShowsResponse);
  const isTodayShowsLoading = isLoadingTodayShows || isFetchingTodayShows;

  const navigateDashboard = useCallback((
    updater: (previous: DashboardSearch) => DashboardSearch,
    options?: { replace?: boolean },
  ) => {
    void navigate({
      to: '/studios/$studioId/dashboard',
      params: { studioId },
      search: (previous) => updater(previous as DashboardSearch),
      replace: options?.replace ?? false,
    });
  }, [navigate, studioId]);

  useEffect(() => {
    if (!hasShowsResponse) {
      return;
    }

    if (showsPage > totalShowPages && totalShowPages > 0) {
      navigateDashboard((previous) => ({ ...previous, page: totalShowPages }), { replace: true });
    }
  }, [hasShowsResponse, navigateDashboard, showsPage, totalShowPages]);

  const operationalDateLabel = formatDate(dayStartIso);

  return (
    <PageLayout
      title="Studio Dashboard"
      description="Daily operational view: shows, active duty manager, and upcoming duty coverage."
    >
      <div className="space-y-4">
        <DashboardDateNavigationCard
          operationalDateLabel={operationalDateLabel}
          operationalDayEndHour={OPERATIONAL_DAY_END_HOUR}
          isTodaySelected={isSelectedToday}
          onPreviousDay={() =>
            navigateDashboard((previous) => ({
              ...previous,
              page: 1,
              date: toLocalDateInputValue(addDays(dayStart, -1)),
            }))}
          onToday={() =>
            navigateDashboard((previous) => ({
              ...previous,
              page: 1,
              date: todayDate,
            }))}
          onNextDay={() =>
            navigateDashboard((previous) => ({
              ...previous,
              page: 1,
              date: toLocalDateInputValue(addDays(dayStart, 1)),
            }))}
        />

        <div className="grid gap-4 lg:grid-cols-3">
          <OperationalDayShowsSummaryCard
            dateLabel={operationalDateLabel}
            operationalDayEndHour={OPERATIONAL_DAY_END_HOUR}
            totalShows={totalShows}
            isLoading={isTodayShowsLoading}
          />
          {isStudioAdmin && (
            <DashboardDutyCoverageCards
              studioId={studioId}
              selectedDate={selectedDate}
              previewUntil={previewUntil}
              isSelectedToday={isSelectedToday}
              dutyReferenceTime={dutyReferenceTime}
            />
          )}
        </div>
        <OperationalDayShowListCard
          studioId={studioId}
          isStudioAdmin={isStudioAdmin}
          operationalDayEndHour={OPERATIONAL_DAY_END_HOUR}
          isLoading={isTodayShowsLoading}
          isFetching={isFetchingTodayShows}
          shows={todayShows}
          totalShows={totalShows}
          currentPage={showsPage}
          totalPages={totalShowPages}
          rowsPerPage={showsLimit}
          formatShowTime={formatTimeHHmm}
          onRowsPerPageChange={(value) =>
            navigateDashboard((previous) => ({
              ...previous,
              page: 1,
              limit: value,
            }))}
          onPreviousPage={() =>
            navigateDashboard((previous) => ({ ...previous, page: Math.max(1, showsPage - 1) }))}
          onNextPage={() =>
            navigateDashboard((previous) => ({ ...previous, page: Math.min(totalShowPages, showsPage + 1) }))}
        />

        <div className="space-y-2">
          <div className="flex justify-end">
            <Button asChild size="sm" variant="outline">
              <Link
                to="/studios/$studioId/my-shifts"
                params={{ studioId }}
                search={{ view: 'calendar', page: 1, limit: 20 }}
              >
                View All
              </Link>
            </Button>
          </div>
          <DashboardMyUpcomingShiftsCard
            studioId={studioId}
            selectedDate={selectedDate}
            previewUntil={previewUntil}
            isSelectedToday={isSelectedToday}
            dayStartMs={dayStart.getTime()}
            nowMs={nowMs}
          />
        </div>
      </div>
    </PageLayout>
  );
}
