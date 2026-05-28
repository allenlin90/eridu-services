import { useCallback, useMemo } from 'react';
import type { DateRange } from 'react-day-picker';

import { DatePickerWithRange } from '@eridu/ui';

import type { ShowRunReviewSearch } from '@/features/show-run-review/config/show-run-review-search-schema';
import {
  buildShowRunReviewDateRange,
  toDateInputValue,
} from '@/features/show-run-review/lib/show-run-review-date-range';
import { fromLocalDateInput } from '@/features/studio-shifts/utils/shift-date.utils';

type ShowRunReviewScopeCardProps = {
  search: ShowRunReviewSearch;
  onSearchChange: (nextSearch: Partial<ShowRunReviewSearch>) => void;
};

function toPickerDateRange(
  dateFrom: string | undefined,
  dateTo: string | undefined,
  fallbackFrom: string,
  fallbackTo: string,
): DateRange {
  return {
    from: fromLocalDateInput(dateFrom ?? fallbackFrom),
    to: dateTo ? fromLocalDateInput(dateTo) : (dateFrom ? undefined : fromLocalDateInput(fallbackTo)),
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
    () => toPickerDateRange(search.date_from, search.date_to, resolvedRange.dateFrom, resolvedRange.dateTo),
    [search.date_from, search.date_to, resolvedRange.dateFrom, resolvedRange.dateTo],
  );

  const handleDateRangeChange = useCallback((nextRange: DateRange | undefined) => {
    onSearchChange({
      date_from: nextRange?.from ? toDateInputValue(nextRange.from) : undefined,
      date_to: nextRange?.to ? toDateInputValue(nextRange.to) : undefined,
    });
  }, [onSearchChange]);

  return (
    <DatePickerWithRange
      className="w-full sm:w-72"
      date={selectedDateRange}
      setDate={handleDateRangeChange}
    />
  );
}
