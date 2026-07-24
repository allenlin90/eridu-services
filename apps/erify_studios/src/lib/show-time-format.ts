import { format } from 'date-fns';

/**
 * Canonical date/time format strings for show start/end rendering across studios
 * table cells. Centralised so the `MMM d, yyyy` / `h:mm a` pair and the
 * `start - end` range string can't drift between the schedule-publish impacts,
 * creator-mapping, and studio-shows column files.
 */
const SHOW_DATE_FORMAT = 'MMM d, yyyy';
const SHOW_TIME_FORMAT = 'h:mm a';

export function formatShowDate(value: string | Date): string {
  return format(new Date(value), SHOW_DATE_FORMAT);
}

export function formatShowTime(value: string | Date): string {
  return format(new Date(value), SHOW_TIME_FORMAT);
}

/**
 * Renders a show time range. Returns `"9:00 AM - 10:00 AM"` when an end time is
 * present and `"9:00 AM"` when it is not — matching the existing per-cell
 * behavior where the end segment is conditional.
 */
export function formatShowTimeRange(start: string | Date, end?: string | Date | null): string {
  const startLabel = formatShowTime(start);
  return end ? `${startLabel} - ${formatShowTime(end)}` : startLabel;
}
