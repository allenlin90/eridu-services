import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { CalendarDays } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { z } from 'zod';

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@eridu/ui';

import { PageLayout } from '@/components/layouts/page-layout';
import {
  DashboardDutyCoverageCards,
  DashboardMyUpcomingShiftsCard,
  TaskSummaryInline,
} from '@/components/studio-dashboard/dashboard-coverage-cards';
import { ShowStandardBadge, ShowStatusBadge } from '@/features/admin/components/show-table-cells';
import { addDays, fromLocalDateInput } from '@/features/studio-shifts/utils/shift-date.utils';
import { formatDate, toLocalDateInputValue } from '@/features/studio-shifts/utils/shift-form.utils';
import { getStudioShows } from '@/features/studio-shows/api/get-studio-shows';
import { useStudioAccess } from '@/lib/hooks/use-studio-access';

const dashboardSearchSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  limit: z.coerce.number().int().min(1).max(100).catch(10),
  date: z.string().optional(),
});
const OPERATIONAL_DAY_END_HOUR = 6;
const DASHBOARD_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
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
  const [nowMs] = useState(() => Date.now());
  const todayDate = toLocalDateInputValue(new Date(nowMs));
  const selectedDate = DASHBOARD_DATE_PATTERN.test(search.date ?? '') ? (search.date as string) : todayDate;
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

  const navigateDashboard = useCallback((
    updater: (previous: typeof search) => typeof search,
    options?: { replace?: boolean },
  ) => {
    void navigate({
      to: '/studios/$studioId/dashboard',
      params: { studioId },
      search: updater,
      replace: options?.replace ?? false,
    });
  }, [navigate, studioId]);

  useEffect(() => {
    if (showsPage > totalShowPages && totalShowPages > 0) {
      navigateDashboard((previous) => ({ ...previous, page: totalShowPages }), { replace: true });
    }
  }, [navigateDashboard, showsPage, totalShowPages]);

  return (
    <PageLayout
      title="Studio Dashboard"
      description="Daily operational view: shows, active duty manager, and upcoming duty coverage."
    >
      <div className="space-y-4">
        <Card>
          <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">
                Operational day:
                {' '}
                {formatDate(dayStartIso)}
              </p>
              <p className="text-xs text-muted-foreground">
                Window: 00:00 to
                {' '}
                {OPERATIONAL_DAY_END_HOUR - 1}
                :59 next day
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  navigateDashboard((previous) => ({
                    ...previous,
                    page: 1,
                    date: toLocalDateInputValue(addDays(dayStart, -1)),
                  }))}
              >
                Previous Day
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={selectedDate === todayDate}
                onClick={() =>
                  navigateDashboard((previous) => ({
                    ...previous,
                    page: 1,
                    date: todayDate,
                  }))}
              >
                Today
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  navigateDashboard((previous) => ({
                    ...previous,
                    page: 1,
                    date: toLocalDateInputValue(addDays(dayStart, 1)),
                  }))}
              >
                Next Day
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                Operational Day Shows
              </CardTitle>
              <CardDescription>
                Shows scheduled for
                {' '}
                {formatDate(dayStartIso)}
                {' '}
                (until
                {' '}
                {OPERATIONAL_DAY_END_HOUR}
                :00 AM next day).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {(isLoadingTodayShows || isFetchingTodayShows)
                ? (
                    <p className="text-sm text-muted-foreground">Loading shows...</p>
                  )
                : (
                    <>
                      <p className="text-2xl font-semibold">{totalShows}</p>
                      <p className="text-sm text-muted-foreground">scheduled shows</p>
                    </>
                  )}
            </CardContent>
          </Card>
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
        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Operational Day Show List</CardTitle>
              <CardDescription>
                Shared operational-day schedule (00:00 to
                {' '}
                {OPERATIONAL_DAY_END_HOUR - 1}
                :59 next day).
              </CardDescription>
            </div>
            {isStudioAdmin && (
              <Button asChild size="sm" variant="outline">
                <Link to="/studios/$studioId/shifts" params={{ studioId }}>
                  Manage Shifts
                </Link>
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {(isLoadingTodayShows || isFetchingTodayShows)
              ? (
                  <p className="text-sm text-muted-foreground">Loading shows...</p>
                )
              : todayShows.length === 0
                ? (
                    <p className="text-sm text-muted-foreground">No shows scheduled for this operational day.</p>
                  )
                : (
                    <div className="overflow-x-auto rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Show</TableHead>
                            <TableHead>Studio Room</TableHead>
                            <TableHead>Show Standard</TableHead>
                            <TableHead>Client</TableHead>
                            <TableHead>MCs</TableHead>
                            <TableHead>Time</TableHead>
                            <TableHead>Task Summary</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {todayShows.map((show) => (
                            <TableRow key={show.id}>
                              <TableCell className="font-medium">{show.name}</TableCell>
                              <TableCell>{show.studio_room_name ?? '-'}</TableCell>
                              <TableCell>
                                <ShowStandardBadge standard={show.show_standard_name ?? undefined} />
                              </TableCell>
                              <TableCell>{show.client_name ?? '-'}</TableCell>
                              <TableCell>
                                {show.mcs && show.mcs.length > 0
                                  ? (
                                      <span
                                        className="block max-w-60 truncate"
                                        title={show.mcs.map((mc) => mc.mc_name).filter(Boolean).join(', ')}
                                      >
                                        {show.mcs.map((mc) => mc.mc_name).filter(Boolean).join(', ')}
                                      </span>
                                    )
                                  : '-'}
                              </TableCell>
                              <TableCell>
                                <span className="whitespace-nowrap">
                                  {formatTimeHHmm(show.start_time)}
                                  {' - '}
                                  {formatTimeHHmm(show.end_time)}
                                </span>
                              </TableCell>
                              <TableCell>
                                {show.task_summary
                                  ? (
                                      <TaskSummaryInline
                                        completed={show.task_summary.completed}
                                        total={show.task_summary.total}
                                        assigned={show.task_summary.assigned}
                                        unassigned={show.task_summary.unassigned}
                                      />
                                    )
                                  : '-'}
                              </TableCell>
                              <TableCell>
                                <ShowStatusBadge status={show.show_status_name ?? 'unknown'} />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
          </CardContent>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between text-sm">
              <p className="text-muted-foreground">
                Page
                {' '}
                {Math.min(showsPage, totalShowPages)}
                {' '}
                of
                {' '}
                {totalShowPages}
                {' '}
                (
                {totalShows}
                {' '}
                shows)
              </p>
              <div className="flex items-center gap-2">
                <div className="hidden items-center gap-2 sm:flex">
                  <span className="text-muted-foreground">Rows</span>
                  <Select
                    value={String(showsLimit)}
                    onValueChange={(value) =>
                      navigateDashboard((previous) => ({
                        ...previous,
                        page: 1,
                        limit: Number(value),
                      }))}
                  >
                    <SelectTrigger className="h-8 w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={showsPage <= 1 || isFetchingTodayShows}
                  onClick={() =>
                    navigateDashboard((previous) => ({ ...previous, page: Math.max(1, previous.page - 1) }))}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={showsPage >= totalShowPages || isFetchingTodayShows}
                  onClick={() =>
                    navigateDashboard((previous) => ({ ...previous, page: Math.min(totalShowPages, previous.page + 1) }))}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-2">
          <div className="flex justify-end">
            <Button asChild size="sm" variant="outline">
              <Link to="/studios/$studioId/my-shifts" params={{ studioId }}>
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
