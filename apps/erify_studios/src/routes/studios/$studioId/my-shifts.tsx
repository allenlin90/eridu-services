import { createFileRoute } from '@tanstack/react-router';
import { RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo } from 'react';
import type { DateRange } from 'react-day-picker';
import { z } from 'zod';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DatePickerWithRange,
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
  TableSkeleton,
} from '@eridu/ui';

import type { StudioShift } from '@/features/studio-shifts/api/studio-shifts.types';
import { StudioShiftsCalendar } from '@/features/studio-shifts/components/studio-shifts-calendar';
import { useMyShifts } from '@/features/studio-shifts/hooks/use-studio-shifts';
import { addDays, fromLocalDateInput, resolveDateParamOrDefault } from '@/features/studio-shifts/utils/shift-date.utils';
import {
  formatDateTime,
  getShiftDisplayDate,
  getShiftWindowLabel,
  toLocalDateInputValue,
} from '@/features/studio-shifts/utils/shift-form.utils';
import { useUserProfile } from '@/lib/hooks/use-user';

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
  component: MyShiftsPage,
});

function formatShiftDurationHours(shift: StudioShift): string {
  const totalMs = shift.blocks.reduce((acc, block) => {
    return acc + (new Date(block.end_time).getTime() - new Date(block.start_time).getTime());
  }, 0);
  return `${(totalMs / (1000 * 60 * 60)).toFixed(2)}h`;
}

function formatProjectedCost(shift: StudioShift): string {
  const numeric = Number(shift.projected_cost);
  if (Number.isNaN(numeric)) {
    return shift.projected_cost;
  }

  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(numeric);
}

function MyShiftsPage() {
  const { studioId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data: profile, isLoading: isLoadingProfile } = useUserProfile();
  const today = toLocalDateInputValue(new Date());
  const dateFrom = resolveDateParamOrDefault(search.date_from, today);
  const dateTo = resolveDateParamOrDefault(search.date_to, toLocalDateInputValue(addDays(fromLocalDateInput(dateFrom), 7)));

  const activeMembership = useMemo(
    () => profile?.studio_memberships?.find((membership) => membership.studio.uid === studioId),
    [profile?.studio_memberships, studioId],
  );
  const viewMode = search.view;

  const {
    data: myShiftsResponse,
    isLoading: isLoadingMyShifts,
    isFetching: isFetchingMyShifts,
    refetch: refetchMyShifts,
  } = useMyShifts({
    page: search.page,
    limit: search.limit,
    studio_id: studioId,
    date_from: dateFrom,
    date_to: dateTo,
    status: search.status,
  }, {
    enabled: Boolean(activeMembership),
  });

  const shifts = myShiftsResponse?.data ?? [];
  const totalPages = myShiftsResponse?.meta?.totalPages ?? 1;
  const total = myShiftsResponse?.meta?.total ?? 0;
  const dateRange: DateRange | undefined = {
    from: new Date(`${dateFrom}T00:00:00`),
    to: new Date(`${dateTo}T00:00:00`),
  };

  const updateSearch = useCallback((
    updater: (previous: typeof search) => typeof search,
    options?: { replace?: boolean },
  ) => {
    void navigate({
      to: '/studios/$studioId/my-shifts',
      params: { studioId },
      search: updater,
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

  if (isLoadingProfile) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Checking access...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!activeMembership) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <Card>
          <CardHeader>
            <CardTitle>My Shifts Access Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              You must be a member of this studio to view personal shifts.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

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
            <Card>
              <CardHeader className="gap-3">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base">My Shift Records</CardTitle>
                    <CardDescription>
                      Read-only table view for your assigned shifts.
                    </CardDescription>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <DatePickerWithRange
                      date={dateRange}
                      setDate={(range) => {
                        updateSearch((previous) => ({
                          ...previous,
                          page: 1,
                          date_from: range?.from ? toLocalDateInputValue(range.from) : today,
                          date_to: range?.to
                            ? toLocalDateInputValue(range.to)
                            : toLocalDateInputValue(addDays(new Date(), 7)),
                        }));
                      }}
                    />
                    <Select
                      value={search.status ?? 'ALL'}
                      onValueChange={(value) =>
                        updateSearch((previous) => ({
                          ...previous,
                          page: 1,
                          status: value === 'ALL' ? undefined : value as 'SCHEDULED' | 'COMPLETED' | 'CANCELLED',
                        }))}
                    >
                      <SelectTrigger className="w-full sm:w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Statuses</SelectItem>
                        <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                        <SelectItem value="COMPLETED">Completed</SelectItem>
                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => void refetchMyShifts()}
                      disabled={isFetchingMyShifts}
                      aria-label="Refresh my shifts"
                    >
                      <RefreshCw className={`h-4 w-4 ${isFetchingMyShifts ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {isLoadingMyShifts
                  ? (
                      <div className="overflow-x-auto rounded-md border">
                        <TableSkeleton columnCount={6} rowCount={Math.max(1, search.limit)} />
                      </div>
                    )
                  : shifts.length === 0
                    ? (
                        <p className="text-sm text-muted-foreground">No assigned shifts found for this date range.</p>
                      )
                    : (
                        <>
                          {isFetchingMyShifts && (
                            <p className="text-xs text-muted-foreground">Refreshing shifts...</p>
                          )}
                          <div className="overflow-x-auto rounded-md border">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Date / Window</TableHead>
                                  <TableHead className="hidden lg:table-cell">Blocks</TableHead>
                                  <TableHead className="hidden md:table-cell">Total Hours</TableHead>
                                  <TableHead className="hidden lg:table-cell">Projected Cost</TableHead>
                                  <TableHead>Status</TableHead>
                                  <TableHead className="hidden md:table-cell">Updated</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {shifts.map((shift) => (
                                  <TableRow key={shift.id}>
                                    <TableCell>
                                      <div className="space-y-0.5">
                                        <p className="font-medium">{getShiftDisplayDate(shift)}</p>
                                        <p className="text-xs text-muted-foreground">{getShiftWindowLabel(shift)}</p>
                                      </div>
                                    </TableCell>
                                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                                      {shift.blocks.length}
                                      {' '}
                                      block
                                      {shift.blocks.length === 1 ? '' : 's'}
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell">
                                      {formatShiftDurationHours(shift)}
                                    </TableCell>
                                    <TableCell className="hidden lg:table-cell">
                                      {formatProjectedCost(shift)}
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant="outline">{shift.status}</Badge>
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                                      {formatDateTime(shift.updated_at)}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </>
                      )}
                <div className="flex items-center justify-between text-sm">
                  <p className="text-muted-foreground">
                    Page
                    {' '}
                    {Math.min(search.page, totalPages)}
                    {' '}
                    of
                    {' '}
                    {totalPages}
                    {' '}
                    (
                    {total}
                    {' '}
                    records)
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="hidden items-center gap-2 sm:flex">
                      <span className="text-muted-foreground">Rows</span>
                      <Select
                        value={String(search.limit)}
                        onValueChange={(value) =>
                          updateSearch((previous) => ({
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
                          <SelectItem value="20">20</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={search.page <= 1 || isFetchingMyShifts}
                      onClick={() =>
                        updateSearch((previous) => ({
                          ...previous,
                          page: Math.max(1, previous.page - 1),
                        }), { replace: false })}
                    >
                      Previous
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={search.page >= totalPages || isFetchingMyShifts}
                      onClick={() =>
                        updateSearch((previous) => ({
                          ...previous,
                          page: Math.min(totalPages, previous.page + 1),
                        }), { replace: false })}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
    </div>
  );
}
