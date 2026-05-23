/**
 * Parses a `rawValue` from `task.content` into a `Date`, or returns `null`
 * when the value is absent, malformed, or empty. Field-level validation
 * catches malformed dates at submission time; refusing to write here keeps a
 * surprise `Invalid Date` from blanking an indexed column.
 */
export function parseDateTimeValue(raw: unknown): Date | null {
  if (raw instanceof Date) {
    return Number.isNaN(raw.getTime()) ? null : raw;
  }
  if (typeof raw !== 'string' || raw.length === 0) {
    return null;
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
