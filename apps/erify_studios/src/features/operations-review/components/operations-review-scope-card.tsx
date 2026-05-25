import { Clock3, RefreshCw } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DatePicker,
  Label,
} from '@eridu/ui';

import {
  buildOperationsReviewRange,
  getOperationsReviewRefetchInterval,
  type OperationsReviewRangeKey,
} from '@/features/operations-review/lib/operations-review-range';

export type OperationsReviewSearch = {
  range: OperationsReviewRangeKey;
  date_from?: string;
  date_to?: string;
};

type OperationsReviewScopeCardProps = {
  search: OperationsReviewSearch;
  onSearchChange: (nextSearch: OperationsReviewSearch) => void;
};

type RangeOption = {
  value: OperationsReviewRangeKey;
  label: string;
};

const RANGE_OPTIONS: RangeOption[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last_7_days', label: 'Last 7 Days' },
  { value: 'custom', label: 'Custom' },
];

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

export function OperationsReviewScopeCard({
  search,
  onSearchChange,
}: OperationsReviewScopeCardProps) {
  const [lastRefreshedAt, setLastRefreshedAt] = useState(() => new Date());
  const range = useMemo(
    () => buildOperationsReviewRange({
      range: search.range,
      dateFrom: search.date_from,
      dateTo: search.date_to,
    }),
    [search.date_from, search.date_to, search.range],
  );
  const refetchInterval = getOperationsReviewRefetchInterval(search.range);

  const handleRangeChange = useCallback((nextRange: OperationsReviewRangeKey) => {
    onSearchChange({
      range: nextRange,
      date_from: nextRange === 'custom' ? range.dateFrom : undefined,
      date_to: nextRange === 'custom' ? range.dateTo : undefined,
    });
  }, [onSearchChange, range.dateFrom, range.dateTo]);

  const handleDateFromChange = useCallback((dateFrom: string) => {
    onSearchChange({
      ...search,
      range: 'custom',
      date_from: dateFrom || undefined,
    });
  }, [onSearchChange, search]);

  const handleDateToChange = useCallback((dateTo: string) => {
    onSearchChange({
      ...search,
      range: 'custom',
      date_to: dateTo || undefined,
    });
  }, [onSearchChange, search]);

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base">Scope</CardTitle>
            <CardDescription>
              {formatWindowLabel(range.windowStart, range.windowEnd)}
            </CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex flex-wrap gap-2">
              {RANGE_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  size="sm"
                  variant={search.range === option.value ? 'default' : 'outline'}
                  onClick={() => handleRangeChange(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
            {search.range === 'custom' && (
              <div className="grid grid-cols-2 gap-2 sm:w-72">
                <div className="grid gap-1">
                  <Label className="text-xs">From</Label>
                  <DatePicker
                    value={range.dateFrom}
                    onChange={handleDateFromChange}
                  />
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs">To</Label>
                  <DatePicker
                    value={range.dateTo}
                    onChange={handleDateToChange}
                  />
                </div>
              </div>
            )}
            <Button
              type="button"
              size="icon"
              variant="outline"
              aria-label="Refresh operations review"
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
          {refetchInterval ? 'Today cadence: 5 min' : 'Manual refresh'}
        </Badge>
      </CardContent>
    </Card>
  );
}
