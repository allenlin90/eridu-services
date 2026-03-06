import { Link } from '@tanstack/react-router';
import { CalendarDays } from 'lucide-react';

import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@eridu/ui';

import { TaskSummaryInline } from './dashboard-coverage-cards';

import { ShowStandardBadge, ShowStatusBadge } from '@/features/admin/components/show-table-cells';
import type { StudioShow } from '@/features/studio-shows/api/get-studio-shows';

type OperationalDayShowsSummaryCardProps = {
  dateLabel: string;
  operationalDayEndHour: number;
  totalShows: number;
  isLoading: boolean;
};

type OperationalDayShowListCardProps = {
  studioId: string;
  isStudioAdmin: boolean;
  operationalDayEndHour: number;
  isLoading: boolean;
  isFetching: boolean;
  shows: StudioShow[];
  totalShows: number;
  currentPage: number;
  totalPages: number;
  rowsPerPage: number;
  formatShowTime: (value: string) => string;
  onRowsPerPageChange: (value: number) => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
};

function formatShowMcs(show: StudioShow): string {
  if (!show.mcs || show.mcs.length === 0) {
    return '-';
  }

  const names = show.mcs.map((mc) => mc.mc_name).filter(Boolean).join(', ');
  return names || '-';
}

export function OperationalDayShowsSummaryCard({
  dateLabel,
  operationalDayEndHour,
  totalShows,
  isLoading,
}: OperationalDayShowsSummaryCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4" />
          Operational Day Shows
        </CardTitle>
        <CardDescription>
          Shows scheduled for
          {' '}
          {dateLabel}
          {' '}
          (until
          {' '}
          {operationalDayEndHour}
          :00 AM next day).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading
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
  );
}

export function OperationalDayShowListCard({
  studioId,
  isStudioAdmin,
  operationalDayEndHour,
  isLoading,
  isFetching,
  shows,
  totalShows,
  currentPage,
  totalPages,
  rowsPerPage,
  formatShowTime,
  onRowsPerPageChange,
  onPreviousPage,
  onNextPage,
}: OperationalDayShowListCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Operational Day Show List</CardTitle>
          <CardDescription>
            Shared operational-day schedule (00:00 to
            {' '}
            {operationalDayEndHour - 1}
            :59 next day).
          </CardDescription>
        </div>
        {isStudioAdmin && (
          <Button asChild size="sm" variant="outline">
            <Link
              to="/studios/$studioId/shifts"
              params={{ studioId }}
              search={{ view: 'calendar', page: 1, limit: 20 }}
            >
              Manage Shifts
            </Link>
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isLoading
          ? (
              <p className="text-sm text-muted-foreground">Loading shows...</p>
            )
          : shows.length === 0
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
                      {shows.map((show) => {
                        const mcNames = formatShowMcs(show);

                        return (
                          <TableRow key={show.id}>
                            <TableCell className="font-medium">{show.name}</TableCell>
                            <TableCell>{show.studio_room_name ?? '-'}</TableCell>
                            <TableCell>
                              <ShowStandardBadge standard={show.show_standard_name ?? undefined} />
                            </TableCell>
                            <TableCell>{show.client_name ?? '-'}</TableCell>
                            <TableCell>
                              {mcNames !== '-'
                                ? (
                                    <span className="block max-w-60 truncate" title={mcNames}>
                                      {mcNames}
                                    </span>
                                  )
                                : '-'}
                            </TableCell>
                            <TableCell>
                              <span className="whitespace-nowrap">
                                {formatShowTime(show.start_time)}
                                {' - '}
                                {formatShowTime(show.end_time)}
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
                        );
                      })}
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
            {Math.min(currentPage, totalPages)}
            {' '}
            of
            {' '}
            {totalPages}
            {' '}
            (
            {totalShows}
            {' '}
            shows)
          </p>
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 sm:flex">
              <span className="text-muted-foreground">Rows</span>
              <Select value={String(rowsPerPage)} onValueChange={(value) => onRowsPerPageChange(Number(value))}>
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
            <Button size="sm" variant="outline" disabled={currentPage <= 1 || isFetching} onClick={onPreviousPage}>
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={currentPage >= totalPages || isFetching}
              onClick={onNextPage}
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
