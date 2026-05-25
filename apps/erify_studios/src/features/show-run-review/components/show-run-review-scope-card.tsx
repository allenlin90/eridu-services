import { useCallback, useMemo } from 'react';
import type { DateRange } from 'react-day-picker';

import { DatePickerWithRange } from '@eridu/ui';

import {
  buildShowRunReviewDateRange,
  type ShowRunReviewSearch,
  toDateInputValue,
} from '@/features/show-run-review/lib/show-run-review-date-range';
import { fromLocalDateInput } from '@/features/studio-shifts/utils/shift-date.utils';

type ShowRunReviewScopeCardProps = {
  search: ShowRunReviewSearch;
  onSearchChange: (nextSearch: ShowRunReviewSearch) => void;
};

function toPickerDateRange(dateFrom: string, dateTo: string): DateRange {
  return {
    from: fromLocalDateInput(dateFrom),
    to: fromLocalDateInput(dateTo),
  };
}

export function ShowRunReviewScopeCard({
  search,
  onSearchChange,
}: ShowRunReviewScopeCardProps) {
  const resolvedRange = useMemo(
    () => buildShowRunReviewDateRange(search),
    [search],
  );
  const selectedDateRange = useMemo(
    () => toPickerDateRange(resolvedRange.dateFrom, resolvedRange.dateTo),
    [resolvedRange.dateFrom, resolvedRange.dateTo],
  );

  const handleDateRangeChange = useCallback((nextRange: DateRange | undefined) => {
    const fromDate = nextRange?.from ?? nextRange?.to;
    const toDate = nextRange?.to ?? nextRange?.from;

    onSearchChange({
      date_from: fromDate ? toDateInputValue(fromDate) : undefined,
      date_to: toDate ? toDateInputValue(toDate) : undefined,
    });
  }, [onSearchChange]);

  return (
    <DatePickerWithRange
      className="sm:w-72"
      date={selectedDateRange}
      setDate={handleDateRangeChange}
    />
  );
}
