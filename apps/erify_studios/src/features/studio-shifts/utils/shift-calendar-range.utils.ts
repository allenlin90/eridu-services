import { addDays } from '@/features/studio-shifts/utils/shift-date.utils';
import { toLocalDateInputValue } from '@/features/studio-shifts/utils/shift-form.utils';

export type ShiftCalendarDateRange = {
  date_from: string;
  date_to: string;
};

export type ShiftCalendarViewBucket = 'day' | 'week' | 'month';

const DEFAULT_BUFFER_BEFORE_DAYS = 1;
const DEFAULT_BUFFER_AFTER_DAYS = 8;
const CALENDAR_QUERY_LIMIT_FALLBACK = 90;
const MONDAY_DAY_INDEX = 1;
const SUNDAY_DAY_INDEX = 0;

const CALENDAR_VIEW_QUERY_PROFILE: Record<ShiftCalendarViewBucket, {
  min: number;
  max: number;
  eventsPerDay: number;
}> = {
  day: {
    min: 24,
    max: 120,
    eventsPerDay: 8,
  },
  week: {
    min: 56,
    max: 260,
    eventsPerDay: 10,
  },
  month: {
    min: 120,
    max: 600,
    eventsPerDay: 12,
  },
};

export function extractDateStringFromUnknown(value: unknown): string | null {
  const raw = String(value);
  const match = raw.match(/\d{4}-\d{2}-\d{2}/);
  return match?.[0] ?? null;
}

export function createDefaultShiftCalendarRange(baseDate = new Date()): ShiftCalendarDateRange {
  const startOfWeek = new Date(baseDate);
  startOfWeek.setHours(0, 0, 0, 0);

  const dayOfWeek = startOfWeek.getDay();
  const daysFromMonday = dayOfWeek === SUNDAY_DAY_INDEX ? 6 : dayOfWeek - MONDAY_DAY_INDEX;
  startOfWeek.setDate(startOfWeek.getDate() - daysFromMonday);

  const endOfWeek = addDays(startOfWeek, 6);

  return {
    date_from: toLocalDateInputValue(startOfWeek),
    date_to: toLocalDateInputValue(endOfWeek),
  };
}

export function createShiftCalendarJumpRange(jumpDate: string): ShiftCalendarDateRange {
  const targetDate = new Date(`${jumpDate}T00:00:00`);
  return {
    date_from: toLocalDateInputValue(addDays(targetDate, -DEFAULT_BUFFER_BEFORE_DAYS)),
    date_to: toLocalDateInputValue(addDays(targetDate, DEFAULT_BUFFER_AFTER_DAYS)),
  };
}

function getShiftCalendarDaySpan(range: ShiftCalendarDateRange): number {
  const start = new Date(`${range.date_from}T00:00:00`);
  const end = new Date(`${range.date_to}T23:59:59`);
  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
}

export function getShiftCalendarViewBucket(range: ShiftCalendarDateRange | null): ShiftCalendarViewBucket {
  if (!range) {
    return 'week';
  }

  const daySpan = getShiftCalendarDaySpan(range);
  if (daySpan <= 2) {
    return 'day';
  }
  if (daySpan <= 10) {
    return 'week';
  }
  return 'month';
}

export function getShiftCalendarRangeLimit(
  range: ShiftCalendarDateRange | null,
  viewBucket = getShiftCalendarViewBucket(range),
): number {
  if (!range) {
    return CALENDAR_QUERY_LIMIT_FALLBACK;
  }

  const daySpan = getShiftCalendarDaySpan(range);
  const profile = CALENDAR_VIEW_QUERY_PROFILE[viewBucket];

  return Math.min(profile.max, Math.max(profile.min, daySpan * profile.eventsPerDay));
}
