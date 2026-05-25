export const SHOW_RUN_REVIEW_DAY_START_HOUR = 6;
export const SHOW_RUN_REVIEW_CURRENT_DAY_REFETCH_INTERVAL_MS = 5 * 60 * 1000;

export type ShowRunReviewSearch = {
  date_from?: string;
  date_to?: string;
};

export type ShowRunReviewDateRange = {
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

export function toDateInputValue(date: Date): string {
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
  if (date.getHours() < SHOW_RUN_REVIEW_DAY_START_HOUR) {
    date.setDate(date.getDate() - 1);
  }
  return toDateInputValue(date);
}

function buildWindowStart(dateInput: string): Date {
  const start = fromDateInputValue(dateInput);
  start.setHours(SHOW_RUN_REVIEW_DAY_START_HOUR, 0, 0, 0);
  return start;
}

function buildWindowEnd(dateInput: string): Date {
  const end = addDays(fromDateInputValue(dateInput), 1);
  end.setHours(SHOW_RUN_REVIEW_DAY_START_HOUR - 1, 59, 59, 999);
  return end;
}

export function buildShowRunReviewDateRange(
  search: ShowRunReviewSearch,
  now = new Date(),
): ShowRunReviewDateRange {
  const currentOperationalDate = getCurrentOperationalDate(now);
  const resolvedDateFrom = isDateInputValue(search.date_from)
    ? search.date_from
    : currentOperationalDate;
  const resolvedDateTo = normalizeDateTo(
    resolvedDateFrom,
    isDateInputValue(search.date_to) ? search.date_to : resolvedDateFrom,
  );

  return {
    dateFrom: resolvedDateFrom,
    dateTo: resolvedDateTo,
    windowStart: buildWindowStart(resolvedDateFrom),
    windowEnd: buildWindowEnd(resolvedDateTo),
  };
}

export function isCurrentShowRunReviewDay(
  range: ShowRunReviewDateRange,
  now = new Date(),
): boolean {
  const currentOperationalDate = getCurrentOperationalDate(now);
  return range.dateFrom === currentOperationalDate && range.dateTo === currentOperationalDate;
}
