export const OPERATIONS_REVIEW_DAY_START_HOUR = 6;
export const OPERATIONS_REVIEW_TODAY_REFETCH_INTERVAL_MS = 5 * 60 * 1000;

export type OperationsReviewRangeKey = 'today' | 'yesterday' | 'last_7_days' | 'custom';

type BuildOperationsReviewRangeInput = {
  range: OperationsReviewRangeKey;
  now?: Date;
  dateFrom?: string;
  dateTo?: string;
};

type OperationsReviewRange = {
  range: OperationsReviewRangeKey;
  dateFrom: string;
  dateTo: string;
  windowStart: Date;
  windowEnd: Date;
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function addDays(base: Date, days: number): Date {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function fromDateInputValue(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date();
  date.setFullYear(year || date.getFullYear(), (month || 1) - 1, day || 1);
  date.setHours(0, 0, 0, 0);
  return date;
}

function isDateInputValue(value: string | undefined): value is string {
  return Boolean(value && DATE_PATTERN.test(value));
}

function normalizeDateTo(dateFrom: string, dateTo: string): string {
  return dateTo < dateFrom ? dateFrom : dateTo;
}

function getCurrentOperationalDate(now: Date): string {
  const date = new Date(now);
  if (date.getHours() < OPERATIONS_REVIEW_DAY_START_HOUR) {
    date.setDate(date.getDate() - 1);
  }
  return toDateInputValue(date);
}

function buildWindowStart(dateInput: string): Date {
  const start = fromDateInputValue(dateInput);
  start.setHours(OPERATIONS_REVIEW_DAY_START_HOUR, 0, 0, 0);
  return start;
}

function buildWindowEnd(dateInput: string): Date {
  const end = addDays(fromDateInputValue(dateInput), 1);
  end.setHours(OPERATIONS_REVIEW_DAY_START_HOUR - 1, 59, 59, 999);
  return end;
}

export function buildOperationsReviewRange({
  range,
  now = new Date(),
  dateFrom,
  dateTo,
}: BuildOperationsReviewRangeInput): OperationsReviewRange {
  const currentOperationalDate = getCurrentOperationalDate(now);

  if (range === 'custom') {
    const resolvedDateFrom = isDateInputValue(dateFrom) ? dateFrom : currentOperationalDate;
    const resolvedDateTo = normalizeDateTo(
      resolvedDateFrom,
      isDateInputValue(dateTo) ? dateTo : resolvedDateFrom,
    );
    return {
      range,
      dateFrom: resolvedDateFrom,
      dateTo: resolvedDateTo,
      windowStart: buildWindowStart(resolvedDateFrom),
      windowEnd: buildWindowEnd(resolvedDateTo),
    };
  }

  if (range === 'last_7_days') {
    const dateToValue = currentOperationalDate;
    const dateFromValue = toDateInputValue(addDays(fromDateInputValue(currentOperationalDate), -6));
    return {
      range,
      dateFrom: dateFromValue,
      dateTo: dateToValue,
      windowStart: buildWindowStart(dateFromValue),
      windowEnd: buildWindowEnd(dateToValue),
    };
  }

  const date = range === 'yesterday'
    ? toDateInputValue(addDays(fromDateInputValue(currentOperationalDate), -1))
    : currentOperationalDate;

  return {
    range,
    dateFrom: date,
    dateTo: date,
    windowStart: buildWindowStart(date),
    windowEnd: buildWindowEnd(date),
  };
}

export function getOperationsReviewRefetchInterval(
  range: OperationsReviewRangeKey,
): false | number {
  return range === 'today' ? OPERATIONS_REVIEW_TODAY_REFETCH_INTERVAL_MS : false;
}
