import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { useMemo } from 'react';
import type { DateRange } from 'react-day-picker';
import { z } from 'zod';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DatePickerWithRange,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@eridu/ui';

import { PageLayout } from '@/components/layouts/page-layout';
import { useStudioMemberCompensations } from '@/features/studio-members/api/members';
import { addDays } from '@/features/studio-shifts/utils/shift-date.utils';
import { toLocalDateInputValue } from '@/features/studio-shifts/utils/shift-form.utils';
import { toDecimalDisplayString } from '@/lib/decimal-format';

function defaultDateRange() {
  const from = new Date();
  return {
    date_from: toLocalDateInputValue(from),
    date_to: toLocalDateInputValue(addDays(from, 30)),
  };
}

const memberCompensationsSearchSchema = z
  .object({
    date_from: z.iso.date().optional(),
    date_to: z.iso.date().optional(),
  })
  .transform((search) => {
    const fallback = defaultDateRange();
    return {
      date_from: search.date_from ?? fallback.date_from,
      date_to: search.date_to ?? fallback.date_to,
    };
  });

export const Route = createFileRoute('/studios/$studioId/members/$memberId/compensations')({
  component: StudioMemberCompensationsPage,
  validateSearch: (search) => memberCompensationsSearchSchema.parse(search),
});

function formatMoney(value: string | null) {
  return value === null ? 'Pending' : `$${toDecimalDisplayString(value)}`;
}

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

  const summary = query.data?.summary;
  const shifts = query.data?.shifts ?? [];
  const pendingCount = summary?.actual_cost_pending_shift_count ?? 0;

  return (
    <PageLayout
      title="Member Compensations"
      description={query.data?.user_name ?? 'Review shift compensation by date range.'}
      actions={(
        <Button variant="outline" size="sm" asChild>
          <Link to="/studios/$studioId/members" params={{ studioId }}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Members
          </Link>
        </Button>
      )}
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <DatePickerWithRange date={dateRange} setDate={handleDateRangeChange} />
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={() => void query.refetch()}
            disabled={query.isFetching}
            aria-label="Refresh member compensations"
          >
            <RefreshCw className={`h-4 w-4 ${query.isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Planned</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">
              {formatMoney(summary?.total_planned_cost ?? '0.00')}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Actual</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">
              {formatMoney(summary?.total_actual_cost ?? '0.00')}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Pending</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">
              {pendingCount}
            </CardContent>
          </Card>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Hourly Rate</TableHead>
                <TableHead>Planned</TableHead>
                <TableHead>Actual</TableHead>
                <TableHead>Blocks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-sm text-muted-foreground">
                    Loading compensations...
                  </TableCell>
                </TableRow>
              )}
              {!query.isLoading && shifts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-sm text-muted-foreground">
                    No shifts in this range.
                  </TableCell>
                </TableRow>
              )}
              {shifts.map((shift) => (
                <TableRow key={shift.shift_id}>
                  <TableCell>{shift.date}</TableCell>
                  <TableCell>
                    <Badge variant={shift.actuals_status === 'resolved' ? 'default' : 'outline'}>
                      {shift.actuals_status}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatMoney(shift.hourly_rate)}</TableCell>
                  <TableCell>{formatMoney(shift.planned_cost)}</TableCell>
                  <TableCell>{formatMoney(shift.actual_cost)}</TableCell>
                  <TableCell>{shift.blocks.length}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </PageLayout>
  );
}
