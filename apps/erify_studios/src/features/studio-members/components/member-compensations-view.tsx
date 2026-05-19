import { Link } from '@tanstack/react-router';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import type { DateRange } from 'react-day-picker';

import type { StudioMemberCompensationResponse } from '@eridu/api-types/memberships';
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
import { toDecimalDisplayString } from '@/lib/decimal-format';

export type MemberCompensationsViewProps = {
  studioId: string;
  dateRange: DateRange;
  data: StudioMemberCompensationResponse | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  onDateRangeChange: (range: DateRange | undefined) => void;
  onRefresh: () => void;
  /** Page title — defaults to the manager surface label. */
  title?: string;
  /** Page description override — defaults to data.user_name. */
  description?: string;
  /** Optional override for the back-link rendered in the header actions slot. */
  backLink?: { to: string; params: Record<string, string>; label: string };
  /** Override for the refresh button's aria-label. */
  refreshAriaLabel?: string;
};

function formatMoney(value: string | null) {
  return value === null ? 'Pending' : `$${toDecimalDisplayString(value)}`;
}

function shiftStatusBadgeVariant(status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED') {
  if (status === 'COMPLETED')
    return 'default' as const;
  if (status === 'CANCELLED')
    return 'secondary' as const;
  return 'outline' as const;
}

export function MemberCompensationsView({
  studioId,
  dateRange,
  data,
  isLoading,
  isFetching,
  isError,
  onDateRangeChange,
  onRefresh,
  title,
  description,
  backLink,
  refreshAriaLabel,
}: MemberCompensationsViewProps) {
  const summary = data?.summary;
  const shifts = data?.shifts ?? [];
  const pendingCount = summary?.actual_cost_pending_shift_count ?? 0;
  const resolvedBackLink = backLink ?? {
    to: '/studios/$studioId/members',
    params: { studioId },
    label: 'Members',
  };

  return (
    <PageLayout
      title={title ?? 'Member Compensations'}
      description={description ?? data?.user_name ?? 'Review shift compensation by date range.'}
      actions={(
        <Button variant="outline" size="sm" asChild>
          <Link to={resolvedBackLink.to} params={resolvedBackLink.params}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {resolvedBackLink.label}
          </Link>
        </Button>
      )}
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <DatePickerWithRange date={dateRange} setDate={onDateRangeChange} />
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={onRefresh}
            disabled={isFetching}
            aria-label={refreshAriaLabel ?? 'Refresh member compensations'}
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
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
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-sm text-muted-foreground">
                    Loading compensations...
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && isError && (
                <TableRow>
                  <TableCell colSpan={6} className="text-sm text-destructive">
                    Failed to load member compensations.
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !isError && shifts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-sm text-muted-foreground">
                    No shifts in this range.
                  </TableCell>
                </TableRow>
              )}
              {!isError && shifts.map((shift) => (
                <TableRow key={shift.shift_id}>
                  <TableCell>{shift.date}</TableCell>
                  <TableCell>
                    <Badge variant={shiftStatusBadgeVariant(shift.status)}>
                      {shift.status}
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
