import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { AlertTriangle, CalendarDays, CheckCircle2, UserCheck, UserMinus } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { z } from 'zod';

import { STUDIO_ROLE } from '@eridu/api-types/memberships';
import {
  Badge,
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
import { ShowStandardBadge, ShowStatusBadge } from '@/features/admin/components/show-table-cells';
import {
  DASHBOARD_DUTY_SHIFTS_LIMIT,
  DASHBOARD_MY_SHIFTS_QUERY_LIMIT,
  DASHBOARD_MY_UPCOMING_SHIFTS_LIMIT,
  STUDIO_MEMBER_MAP_DEFAULT_LIMIT,
} from '@/features/studio-shifts/constants/studio-shifts.constants';
import { useStudioMemberMap } from '@/features/studio-shifts/hooks/use-studio-member-map';
import {
  useDutyManager,
  useMyShifts,
  useStudioShifts,
} from '@/features/studio-shifts/hooks/use-studio-shifts';
import { formatDate, getShiftWindowLabel, toLocalDateInputValue } from '@/features/studio-shifts/utils/shift-form.utils';
import { getShiftFirstBlockStartMs, sortShiftsByFirstBlockStart } from '@/features/studio-shifts/utils/shift-timeline.utils';
import { getStudioShows } from '@/features/studio-shows/api/get-studio-shows';
import { useUserProfile } from '@/lib/hooks/use-user';

const dashboardSearchSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  limit: z.coerce.number().int().min(1).max(100).catch(10),
  date: z.string().optional(),
});

export const Route = createFileRoute('/studios/$studioId/dashboard')({
  component: StudioDashboardPage,
  validateSearch: (search) => dashboardSearchSchema.parse(search),
});

function addDays(base: Date, days: number): Date {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

function fromLocalDateInput(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date();
  date.setFullYear(year || date.getFullYear(), (month || 1) - 1, day || 1);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatTimeHHmm(value: string): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
}

function StudioDashboardPage() {
  const OPERATIONAL_DAY_END_HOUR = 6;
  const { studioId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const now = new Date();
  const todayDate = toLocalDateInputValue(now);
  const selectedDate = /^\d{4}-\d{2}-\d{2}$/.test(search.date ?? '') ? (search.date as string) : todayDate;
  const isSelectedToday = selectedDate === todayDate;

  const showsPage = search.page;
  const showsLimit = search.limit;
  const { data: profile } = useUserProfile();

  const activeMembership = useMemo(
    () => profile?.studio_memberships?.find((membership) => membership.studio.uid === studioId),
    [profile?.studio_memberships, studioId],
  );
  const isStudioAdmin = activeMembership?.role === STUDIO_ROLE.ADMIN;

  const dayStart = fromLocalDateInput(selectedDate);
  const dayEnd = addDays(dayStart, 1);
  dayEnd.setHours(OPERATIONAL_DAY_END_HOUR - 1, 59, 59, 999);
  const dutyReferenceTime = isSelectedToday
    ? undefined
    : dayStart.toISOString();

  const previewUntil = toLocalDateInputValue(addDays(dayStart, 7));

  const { data: dutyManager, isLoading: isLoadingDutyManager } = useDutyManager(studioId, dutyReferenceTime);

  const {
    data: dutyShiftResponse,
    isLoading: isLoadingDutyShifts,
    isFetching: isFetchingDutyShifts,
  } = useStudioShifts(studioId, {
    page: 1,
    limit: DASHBOARD_DUTY_SHIFTS_LIMIT,
    date_from: selectedDate,
    date_to: previewUntil,
    is_duty_manager: true,
  });
  const {
    data: myShiftResponse,
    isLoading: isLoadingMyShifts,
    isFetching: isFetchingMyShifts,
  } = useMyShifts({
    page: 1,
    limit: DASHBOARD_MY_SHIFTS_QUERY_LIMIT,
    studio_id: studioId,
    date_from: selectedDate,
    date_to: previewUntil,
  }, {
    enabled: Boolean(studioId),
  });
  const { memberMap } = useStudioMemberMap(studioId, { limit: STUDIO_MEMBER_MAP_DEFAULT_LIMIT });

  const {
    data: todayShowsResponse,
    isLoading: isLoadingTodayShows,
    isFetching: isFetchingTodayShows,
  } = useQuery({
    queryKey: ['studio-dashboard', studioId, 'today-shows', dayStart.toISOString(), dayEnd.toISOString(), showsPage, showsLimit],
    queryFn: () =>
      getStudioShows(studioId, {
        page: showsPage,
        limit: showsLimit,
        date_from: dayStart.toISOString(),
        date_to: dayEnd.toISOString(),
      }),
    enabled: Boolean(studioId),
  });
  const activeShiftStartMs = dutyManager ? getShiftFirstBlockStartMs(dutyManager) : null;

  const upcomingDutyManagerShifts = sortShiftsByFirstBlockStart(dutyShiftResponse?.data ?? [])
    .filter((shift) => {
      const shiftStartMs = getShiftFirstBlockStartMs(shift);
      if (shiftStartMs === null) {
        return false;
      }
      if (shift.id === dutyManager?.id) {
        return false;
      }
      if (activeShiftStartMs === null) {
        return true;
      }
      return shiftStartMs > activeShiftStartMs;
    });

  const nextDutyShift = upcomingDutyManagerShifts[0];
  const myUpcomingShifts = sortShiftsByFirstBlockStart(myShiftResponse?.data ?? [])
    .filter((shift) => {
      const shiftStartMs = getShiftFirstBlockStartMs(shift);
      if (shiftStartMs === null) {
        return false;
      }

      const referenceTime = isSelectedToday ? now.getTime() : dayStart.getTime();
      return shiftStartMs >= referenceTime;
    })
    .slice(0, DASHBOARD_MY_UPCOMING_SHIFTS_LIMIT);

  const totalShows = todayShowsResponse?.meta?.total ?? 0;
  const totalShowPages = todayShowsResponse?.meta?.totalPages ?? 1;
  const todayShows = todayShowsResponse?.data ?? [];
  useEffect(() => {
    if (showsPage > totalShowPages && totalShowPages > 0) {
      void navigate({
        to: '/studios/$studioId/dashboard',
        params: { studioId },
        search: (previous) => ({ ...previous, page: totalShowPages }),
        replace: true,
      });
    }
  }, [navigate, showsPage, studioId, totalShowPages]);

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
                {formatDate(dayStart.toISOString())}
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
                  navigate({
                    to: '/studios/$studioId/dashboard',
                    params: { studioId },
                    search: (previous) => ({
                      ...previous,
                      page: 1,
                      date: toLocalDateInputValue(addDays(dayStart, -1)),
                    }),
                  })}
              >
                Previous Day
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={selectedDate === todayDate}
                onClick={() =>
                  navigate({
                    to: '/studios/$studioId/dashboard',
                    params: { studioId },
                    search: (previous) => ({
                      ...previous,
                      page: 1,
                      date: todayDate,
                    }),
                  })}
              >
                Today
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  navigate({
                    to: '/studios/$studioId/dashboard',
                    params: { studioId },
                    search: (previous) => ({
                      ...previous,
                      page: 1,
                      date: toLocalDateInputValue(addDays(dayStart, 1)),
                    }),
                  })}
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
                {formatDate(dayStart.toISOString())}
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

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-4 w-4" />
                Active Duty Manager
              </CardTitle>
              <CardDescription>
                {isSelectedToday
                  ? 'Current on-shift owner for this studio.'
                  : 'Duty manager at the start of this operational day.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingDutyManager
                ? (
                    <p className="text-sm text-muted-foreground">Loading active duty manager...</p>
                  )
                : dutyManager
                  ? (
                      <div className="space-y-1">
                        <p className="font-medium">{memberMap.get(dutyManager.user_id)?.name ?? dutyManager.user_id}</p>
                        <p className="text-sm text-muted-foreground">{getShiftWindowLabel(dutyManager)}</p>
                        <Badge className="mt-1">On Duty</Badge>
                      </div>
                    )
                  : (
                      <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-800">
                        <p className="inline-flex items-center gap-2 text-sm font-medium">
                          <AlertTriangle className="h-4 w-4" />
                          No active duty manager right now
                        </p>
                        <p className="mt-1 text-xs">
                          Please check shift assignments to ensure duty coverage.
                        </p>
                      </div>
                    )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Next Duty Manager</CardTitle>
              <CardDescription>
                Next upcoming duty assignment.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {(isLoadingDutyShifts || isFetchingDutyShifts)
                ? (
                    <p className="text-sm text-muted-foreground">Loading upcoming shifts...</p>
                  )
                : nextDutyShift
                  ? (
                      <>
                        <p className="font-medium">{memberMap.get(nextDutyShift.user_id)?.name ?? nextDutyShift.user_id}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(nextDutyShift.date)}
                          {' '}
                          |
                          {' '}
                          {getShiftWindowLabel(nextDutyShift)}
                        </p>
                      </>
                    )
                  : (
                      <p className="text-sm text-muted-foreground">No upcoming duty manager shift in the next 7 days from this day.</p>
                    )}
            </CardContent>
          </Card>
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
                                      <div className="flex flex-wrap items-center gap-3 text-sm">
                                        <span className="inline-flex items-center gap-1 text-emerald-700">
                                          <CheckCircle2 className="h-4 w-4" />
                                          {show.task_summary.completed}
                                          /
                                          {show.task_summary.total}
                                        </span>
                                        <span className="inline-flex items-center gap-1 text-blue-700">
                                          <UserCheck className="h-4 w-4" />
                                          {show.task_summary.assigned}
                                        </span>
                                        <span className="inline-flex items-center gap-1 text-amber-700">
                                          <UserMinus className="h-4 w-4" />
                                          {show.task_summary.unassigned}
                                        </span>
                                      </div>
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
                      navigate({
                        to: '/studios/$studioId/dashboard',
                        params: { studioId },
                        search: (previous) => ({
                          ...previous,
                          page: 1,
                          limit: Number(value),
                        }),
                      })}
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
                    navigate({
                      to: '/studios/$studioId/dashboard',
                      params: { studioId },
                      search: (previous) => ({ ...previous, page: Math.max(1, previous.page - 1) }),
                    })}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={showsPage >= totalShowPages || isFetchingTodayShows}
                  onClick={() =>
                    navigate({
                      to: '/studios/$studioId/dashboard',
                      params: { studioId },
                      search: (previous) => ({ ...previous, page: Math.min(totalShowPages, previous.page + 1) }),
                    })}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>My Upcoming Shifts</CardTitle>
            <CardDescription>
              Next 5 assigned shifts from the selected operational day.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {(isLoadingMyShifts || isFetchingMyShifts)
              ? (
                  <p className="text-sm text-muted-foreground">Loading your upcoming shifts...</p>
                )
              : myUpcomingShifts.length === 0
                ? (
                    <p className="text-sm text-muted-foreground">No upcoming assigned shifts in the next 7 days.</p>
                  )
                : (
                    <div className="space-y-2">
                      {myUpcomingShifts.map((shift) => (
                        <div key={shift.id} className="rounded-md border p-2">
                          <p className="text-sm font-medium">{formatDate(shift.date)}</p>
                          <p className="text-xs text-muted-foreground">
                            {getShiftWindowLabel(shift)}
                            {' | '}
                            {shift.status}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
