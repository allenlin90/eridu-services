import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useCallback, useMemo } from 'react';
import { z } from 'zod';

import { PageLayout } from '@/components/layouts/page-layout';
import {
  DashboardDutyCoverageCards,
} from '@/components/studio-dashboard/dashboard-coverage-cards';
import { DashboardDateNavigationCard } from '@/components/studio-dashboard/dashboard-date-navigation-card';
import {
  OperationalDayShowListCard,
  OperationalDayShowsSummaryCard,
} from '@/components/studio-dashboard/dashboard-show-sections';
import {
  addDays,
  buildOperationalDayWindow,
  DEFAULT_OPERATIONAL_DAY_END_HOUR,
} from '@/features/studio-shifts/utils/shift-date.utils';
import { formatDate, toLocalDateInputValue } from '@/features/studio-shifts/utils/shift-form.utils';
import { useDashboardOperationalDayShowsPageController } from '@/features/studio-shows/hooks/use-dashboard-operational-day-shows-page-controller';
import { useStudioAccess } from '@/lib/hooks/use-studio-access';

const DASHBOARD_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const dashboardSearchSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  limit: z.coerce.number().int().min(1).max(100).catch(10),
  date: z.string().regex(DASHBOARD_DATE_PATTERN).optional().catch(undefined),
});
type DashboardSearch = z.infer<typeof dashboardSearchSchema>;

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
  const todayDate = toLocalDateInputValue(new Date());
  const selectedDate = search.date ?? todayDate;
  const isSelectedToday = selectedDate === todayDate;

  const { hasAccess } = useStudioAccess(studioId);
  const isStudioAdmin = hasAccess('shifts');

  const { dayStart, dayStartIso, dayEndIso } = useMemo(
    // Local-runtime operational day window for dashboard UX; API receives ISO instants.
    () => buildOperationalDayWindow(selectedDate),
    [selectedDate],
  );
  const dutyReferenceTime = isSelectedToday ? undefined : dayStartIso;

  const previewUntil = useMemo(
    () => toLocalDateInputValue(addDays(dayStart, 7)),
    [dayStart],
  );

  const {
    isLoading: isLoadingTodayShows,
    isFetching: isFetchingTodayShows,
    shows: todayShows,
    pagination,
    onPaginationChange,
  } = useDashboardOperationalDayShowsPageController({
    studioId,
    dayStartIso,
    dayEndIso,
  });
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

  const operationalDateLabel = formatDate(dayStartIso);

  return (
    <PageLayout
      title="Studio Dashboard"
      description="Daily operational view: shows, active duty manager, and upcoming duty coverage."
    >
      <div className="space-y-4">
        <DashboardDateNavigationCard
          operationalDateLabel={operationalDateLabel}
          operationalDayEndHour={DEFAULT_OPERATIONAL_DAY_END_HOUR}
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
            operationalDayEndHour={DEFAULT_OPERATIONAL_DAY_END_HOUR}
            totalShows={pagination.total}
            isLoading={isTodayShowsLoading}
          />
          <DashboardDutyCoverageCards
            studioId={studioId}
            selectedDate={selectedDate}
            previewUntil={previewUntil}
            isSelectedToday={isSelectedToday}
            dutyReferenceTime={dutyReferenceTime}
          />
        </div>
        <OperationalDayShowListCard
          studioId={studioId}
          isStudioAdmin={isStudioAdmin}
          operationalDayEndHour={DEFAULT_OPERATIONAL_DAY_END_HOUR}
          isLoading={isTodayShowsLoading}
          shows={todayShows}
          pagination={pagination}
          onPaginationChange={onPaginationChange}
          formatShowTime={formatTimeHHmm}
        />

      </div>
    </PageLayout>
  );
}
