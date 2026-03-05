import { addDays } from '@/features/studio-shifts/utils/shift-date.utils';
import { toLocalDateInputValue } from '@/features/studio-shifts/utils/shift-form.utils';

export type ShiftCalendarDateRange = {
  date_from: string;
  date_to: string;
};

const DEFAULT_BUFFER_BEFORE_DAYS = 1;
const DEFAULT_BUFFER_AFTER_DAYS = 8;
const CALENDAR_QUERY_LIMIT_FALLBACK = 150;
const CALENDAR_QUERY_LIMIT_MIN = 60;
const CALENDAR_QUERY_LIMIT_MAX = 600;
const CALENDAR_QUERY_EVENTS_PER_DAY = 12;

export function extractDateStringFromUnknown(value: unknown): string | null {
  const raw = String(value);
  const match = raw.match(/\d{4}-\d{2}-\d{2}/);
  return match?.[0] ?? null;
}

export function createDefaultShiftCalendarRange(baseDate = new Date()): ShiftCalendarDateRange {
  return {
    date_from: toLocalDateInputValue(addDays(baseDate, -DEFAULT_BUFFER_BEFORE_DAYS)),
    date_to: toLocalDateInputValue(addDays(baseDate, DEFAULT_BUFFER_AFTER_DAYS)),
  };
}

export function createShiftCalendarJumpRange(jumpDate: string): ShiftCalendarDateRange {
  const targetDate = new Date(`${jumpDate}T00:00:00`);
  return {
    date_from: toLocalDateInputValue(addDays(targetDate, -DEFAULT_BUFFER_BEFORE_DAYS)),
    date_to: toLocalDateInputValue(addDays(targetDate, DEFAULT_BUFFER_AFTER_DAYS)),
  };
}

export function getShiftCalendarRangeLimit(range: ShiftCalendarDateRange | null): number {
  if (!range) {
    return CALENDAR_QUERY_LIMIT_FALLBACK;
  }

  const start = new Date(`${range.date_from}T00:00:00`);
  const end = new Date(`${range.date_to}T23:59:59`);
  const daySpan = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

  return Math.min(
    CALENDAR_QUERY_LIMIT_MAX,
    Math.max(CALENDAR_QUERY_LIMIT_MIN, daySpan * CALENDAR_QUERY_EVENTS_PER_DAY),
  );
}
