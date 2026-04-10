import { RefreshCw, ShieldCheck } from 'lucide-react';
import type { DateRange } from 'react-day-picker';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DataTablePagination,
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
import type {
  MyShiftsRouteSearch,
  MyShiftStatus,
} from '@/features/studio-shifts/utils/my-shifts-route-search.utils';
import {
  formatDateTime,
  getShiftDisplayDate,
  getShiftWindowLabel,
} from '@/features/studio-shifts/utils/shift-form.utils';

type MyShiftsTableCardProps = {
  search: MyShiftsRouteSearch;
  shifts: StudioShift[];
  pagination: {
    pageIndex: number;
    pageSize: number;
    total: number;
    pageCount: number;
  };
  onPaginationChange: (pagination: { pageIndex: number; pageSize: number }) => void;
  dateRange: DateRange;
  isLoading: boolean;
  isFetching: boolean;
  onDateRangeChange: (range: DateRange | undefined) => void;
  onStatusChange: (status?: MyShiftStatus) => void;
  onRefresh: () => void;
};

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

export function MyShiftsTableCard({
  search,
  shifts,
  pagination,
  onPaginationChange,
  dateRange,
  isLoading,
  isFetching,
  onDateRangeChange,
  onStatusChange,
  onRefresh,
}: MyShiftsTableCardProps) {
  return (
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
                onDateRangeChange({
                  from: range?.from,
                  to: range?.to,
                });
              }}
            />
            <Select
              value={search.status ?? 'ALL'}
              onValueChange={(value) => onStatusChange(value === 'ALL' ? undefined : (value as MyShiftStatus))}
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
              onClick={onRefresh}
              disabled={isFetching}
              aria-label="Refresh my shifts"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading
          ? (
              <div className="overflow-x-auto rounded-md border">
                <TableSkeleton columnCount={6} rowCount={Math.max(1, pagination.pageSize)} />
              </div>
            )
          : shifts.length === 0
            ? (
                <p className="text-sm text-muted-foreground">No assigned shifts found for this date range.</p>
              )
            : (
                <>
                  {isFetching && (
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
                              <div className="flex flex-wrap gap-1">
                                <Badge variant="outline">{shift.status}</Badge>
                                {shift.is_duty_manager && (
                                  <Badge variant="secondary" className="px-1.5 py-0 border-amber-200 bg-amber-50 text-amber-700">
                                    <ShieldCheck className="h-3 w-3 mr-1" />
                                    Duty
                                  </Badge>
                                )}
                              </div>
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
        <div className="pt-1">
          <DataTablePagination
            pagination={pagination}
            onPaginationChange={onPaginationChange}
          />
        </div>
      </CardContent>
    </Card>
  );
}
