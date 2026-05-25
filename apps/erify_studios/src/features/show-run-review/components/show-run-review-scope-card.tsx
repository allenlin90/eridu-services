import { Clock3, RefreshCw } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import type { DateRange } from 'react-day-picker';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DatePickerWithRange,
} from '@eridu/ui';

import {
  buildShowRunReviewDateRange,
  isCurrentShowRunReviewDay,
  type ShowRunReviewSearch,
  toDateInputValue,
} from '@/features/show-run-review/lib/show-run-review-date-range';

type ShowRunReviewScopeCardProps = {
  search: ShowRunReviewSearch;
  onSearchChange: (nextSearch: ShowRunReviewSearch) => void;
};

const DATETIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

function formatWindowLabel(start: Date, end: Date): string {
  return `${DATETIME_FORMATTER.format(start)} - ${DATETIME_FORMATTER.format(end)}`;
}

function formatRefreshLabel(value: Date): string {
  return DATETIME_FORMATTER.format(value);
}

function toDateRange(dateFrom: string, dateTo: string): DateRange {
  return {
    from: new Date(`${dateFrom}T00:00:00`),
    to: new Date(`${dateTo}T00:00:00`),
  };
}

export function ShowRunReviewScopeCard({
  search,
  onSearchChange,
}: ShowRunReviewScopeCardProps) {
  const [lastRefreshedAt, setLastRefreshedAt] = useState(() => new Date());
  const resolvedRange = useMemo(
    () => buildShowRunReviewDateRange(search),
    [search],
  );
  const selectedDateRange = useMemo(
    () => toDateRange(resolvedRange.dateFrom, resolvedRange.dateTo),
    [resolvedRange.dateFrom, resolvedRange.dateTo],
  );
  const isCurrentDay = isCurrentShowRunReviewDay(resolvedRange);

  const handleDateRangeChange = useCallback((nextRange: DateRange | undefined) => {
    const fromDate = nextRange?.from ?? nextRange?.to;
    const toDate = nextRange?.to ?? nextRange?.from;

    onSearchChange({
      date_from: fromDate ? toDateInputValue(fromDate) : undefined,
      date_to: toDate ? toDateInputValue(toDate) : undefined,
    });
  }, [onSearchChange]);

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base">Review Range</CardTitle>
            <CardDescription>
              {formatWindowLabel(resolvedRange.windowStart, resolvedRange.windowEnd)}
            </CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <DatePickerWithRange
              className="sm:w-72"
              date={selectedDateRange}
              setDate={handleDateRangeChange}
            />
            <Button
              type="button"
              size="icon"
              variant="outline"
              aria-label="Refresh show run review"
              onClick={() => setLastRefreshedAt(new Date())}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span>
          Last refreshed at
          {' '}
          {formatRefreshLabel(lastRefreshedAt)}
        </span>
        <Badge variant="outline" className="flex w-fit items-center gap-1 font-normal">
          <Clock3 className="h-3.5 w-3.5" />
          {isCurrentDay ? 'Current day cadence: 5 min' : 'Manual refresh'}
        </Badge>
      </CardContent>
    </Card>
  );
}
