import { format } from 'date-fns';

/**
 * Safely format a date string with a date-fns pattern, returning a fallback for
 * missing or unparseable values.
 */
export function formatShowDate(
  value: string | null | undefined,
  pattern: string,
  fallback = '-',
): string {
  if (!value) {
    return fallback;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return fallback;
  }
  return format(date, pattern);
}
