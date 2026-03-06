export function addDays(base: Date, days: number): Date {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

export const DEFAULT_OPERATIONAL_DAY_END_HOUR = 6;

export function fromLocalDateInput(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date();
  date.setFullYear(year || date.getFullYear(), (month || 1) - 1, day || 1);
  date.setHours(0, 0, 0, 0);
  return date;
}

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
