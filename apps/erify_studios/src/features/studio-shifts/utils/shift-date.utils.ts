export function addDays(base: Date, days: number): Date {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

export const DEFAULT_OPERATIONAL_DAY_END_HOUR = 6;

/**
 * Parse `YYYY-MM-DD` as a local-runtime calendar date at local midnight.
 *
 * Note:
 * - DB timestamps are persisted as UTC instants (`toISOString()`).
 * - FE date-only inputs represent user-local calendar dates, so parsing here must be local.
 */
export function fromLocalDateInput(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date();
  date.setFullYear(year || date.getFullYear(), (month || 1) - 1, day || 1);
  date.setHours(0, 0, 0, 0);
  return date;
}

/**
 * Build an operational-day window for frontend UX using local-runtime time.
 *
 * This utility intentionally follows local calendar semantics for route/search-driven UI
 * (dashboard and my-shifts). The resulting ISO strings are UTC instants suitable for API
 * query params, but the boundary math itself is based on local time.
 */
export function buildOperationalDayWindow(
  selectedDate: string,
  endHour: number = DEFAULT_OPERATIONAL_DAY_END_HOUR,
) {
  const dayStart = fromLocalDateInput(selectedDate);
  const dayEnd = addDays(dayStart, 1);
  dayEnd.setHours(endHour - 1, 59, 59, 999);

  return {
    dayStart,
    dayEnd,
    dayStartIso: dayStart.toISOString(),
    dayEndIso: dayEnd.toISOString(),
  };
}

export function resolveDateParamOrDefault(value: string | undefined, fallback: string): string {
  if (!value) {
    return fallback;
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : fallback;
}
