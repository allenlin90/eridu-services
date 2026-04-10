import { Link } from '@tanstack/react-router';
import { CalendarDays } from 'lucide-react';

import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, DataTablePagination, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@eridu/ui';

import { TaskSummaryInline } from './dashboard-coverage-cards';

import { ShowStandardBadge, ShowStatusBadge } from '@/features/admin/components/show-table-cells';
import type { StudioShow } from '@/features/studio-shows/api/get-studio-shows';
import { getCreatorNames } from '@/lib/creator-utils';

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
  shows: StudioShow[];
  pagination: {
    pageIndex: number;
    pageSize: number;
    total: number;
    pageCount: number;
  };
  onPaginationChange: (pagination: { pageIndex: number; pageSize: number }) => void;
  formatShowTime: (value: string) => string;
};

function formatShowCreators(show: StudioShow): string {
  const creatorNames = getCreatorNames(show);
  if (creatorNames.length === 0) {
    return '-';
  }

  const names = creatorNames.join(', ');
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
  shows,
  pagination,
  onPaginationChange,
  formatShowTime,
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
                        <TableHead>Creators</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Task Summary</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {shows.map((show) => {
                        const creatorNames = formatShowCreators(show);

                        return (
                          <TableRow key={show.id}>
                            <TableCell className="font-medium">{show.name}</TableCell>
                            <TableCell>{show.studio_room_name ?? '-'}</TableCell>
                            <TableCell>
                              <ShowStandardBadge standard={show.show_standard_name ?? undefined} />
                            </TableCell>
                            <TableCell>{show.client_name ?? '-'}</TableCell>
                            <TableCell>
                              {creatorNames !== '-'
                                ? (
                                    <span className="block max-w-60 truncate" title={creatorNames}>
                                      {creatorNames}
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
        <DataTablePagination
          pagination={pagination}
          onPaginationChange={onPaginationChange}
          textOverrides={{
            showingEntries: (start, end, total) => (
              <>
                Showing
                {' '}
                {start}
                {' '}
                to
                {' '}
                {end}
                {' '}
                of
                {' '}
                {total}
                {' '}
                shows
              </>
            ),
          }}
        />
      </CardContent>
    </Card>
  );
}
