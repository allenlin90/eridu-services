import { fromLocalDateInput } from '@/features/studio-shifts/utils/shift-date.utils';

export const OPERATIONAL_DAY_START_HOUR = 6;
export const OPERATIONAL_DAY_CURRENT_REFETCH_INTERVAL_MS = 5 * 60 * 1000;

export type OperationalDaySearch = {
  date_from?: string;
  date_to?: string;
};

export type OperationalDayRange = {
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

export function toOperationalDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isOperationalDateInputValue(value: string | undefined): value is string {
  return Boolean(value && DATE_PATTERN.test(value));
}

export function normalizeOperationalDateTo(dateFrom: string, dateTo: string): string {
  return dateTo < dateFrom ? dateFrom : dateTo;
}

export function getCurrentOperationalDate(now = new Date()): string {
  const date = new Date(now);
  if (date.getHours() < OPERATIONAL_DAY_START_HOUR) {
    date.setDate(date.getDate() - 1);
  }
  return toOperationalDateInputValue(date);
}

function buildWindowStart(dateInput: string): Date {
  const start = fromLocalDateInput(dateInput);
  start.setHours(OPERATIONAL_DAY_START_HOUR, 0, 0, 0);
  return start;
}

function buildWindowEnd(dateInput: string): Date {
  const end = addDays(fromLocalDateInput(dateInput), 1);
  end.setHours(OPERATIONAL_DAY_START_HOUR - 1, 59, 59, 999);
  return end;
}

export function buildOperationalDayRange(
  search: OperationalDaySearch,
  now = new Date(),
): OperationalDayRange {
  const currentOperationalDate = getCurrentOperationalDate(now);
  const resolvedDateFrom = isOperationalDateInputValue(search.date_from)
    ? search.date_from
    : currentOperationalDate;
  const resolvedDateTo = normalizeOperationalDateTo(
    resolvedDateFrom,
    isOperationalDateInputValue(search.date_to) ? search.date_to : resolvedDateFrom,
  );

  return {
    dateFrom: resolvedDateFrom,
    dateTo: resolvedDateTo,
    windowStart: buildWindowStart(resolvedDateFrom),
    windowEnd: buildWindowEnd(resolvedDateTo),
  };
}

function operationalDateFromWindowStart(windowStart: Date): string {
  return toOperationalDateInputValue(windowStart);
}

function operationalDateFromWindowEnd(windowEnd: Date): string {
  const date = new Date(windowEnd);
  if (date.getHours() < OPERATIONAL_DAY_START_HOUR) {
    date.setDate(date.getDate() - 1);
  }
  return toOperationalDateInputValue(date);
}

export function buildOperationalDayRangeFromPickerDates(
  fromDate: Date | undefined,
  toDate: Date | undefined,
  now = new Date(),
): OperationalDayRange {
  const fallback = buildOperationalDayRange({}, now);
  const dateFrom = fromDate || toDate
    ? toOperationalDateInputValue(fromDate ?? toDate!)
    : fallback.dateFrom;
  const dateTo = toDate || fromDate
    ? toOperationalDateInputValue(toDate ?? fromDate!)
    : fallback.dateTo;

  return buildOperationalDayRange({
    date_from: dateFrom,
    date_to: normalizeOperationalDateTo(dateFrom, dateTo),
  }, now);
}

export function isCurrentOperationalDay(
  range: OperationalDayRange,
  now = new Date(),
): boolean {
  const currentOperationalDate = getCurrentOperationalDate(now);
  return range.dateFrom === currentOperationalDate && range.dateTo === currentOperationalDate;
}

export function operationalDayRangeToPickerDates(range: OperationalDayRange) {
  return {
    from: fromLocalDateInput(range.dateFrom),
    to: fromLocalDateInput(range.dateTo),
  };
}

export function operationalWindowToDayRange(window: { from?: Date; to?: Date } | undefined, now = new Date()) {
  if (!window?.from && !window?.to) {
    return buildOperationalDayRange({}, now);
  }

  const dateFrom = window.from
    ? operationalDateFromWindowStart(window.from)
    : window.to
      ? operationalDateFromWindowEnd(window.to)
      : getCurrentOperationalDate(now);
  const dateTo = window.to
    ? operationalDateFromWindowEnd(window.to)
    : dateFrom;

  return buildOperationalDayRange({
    date_from: dateFrom,
    date_to: normalizeOperationalDateTo(dateFrom, dateTo),
  }, now);
}
