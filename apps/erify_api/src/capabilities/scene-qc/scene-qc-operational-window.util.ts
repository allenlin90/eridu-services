import { OPERATIONAL_DAY_START_HOUR } from '@/lib/utils/operational-day.util';

/**
 * Stage 1 shared operational-timezone constant. Exactly one Studio exists
 * today and every operator/caller already agrees on Asia/Bangkok. Promote to a
 * real `Studio.timezone` column only when a second timezone studio appears
 * (`docs/ideation/studio-config-settings.md` section 6): add the column,
 * backfill it, and pass its value into {@link resolveOperationalWindow}
 * instead of this constant. No other change needed — the resolver already
 * takes a timezone string parameter.
 */
export const OPERATIONAL_TIMEZONE = 'Asia/Bangkok';

export type OperationalWindow = {
  /** `YYYY-MM-DD` operational date this window represents. */
  operationalDate: string;
  /** INCLUSIVE: local {@link OPERATIONAL_DAY_START_HOUR}:00 on `operationalDate`, in UTC. */
  windowStart: Date;
  /** EXCLUSIVE: local {@link OPERATIONAL_DAY_START_HOUR}:00 on the next calendar day, in UTC. */
  windowEnd: Date;
  timezone: string;
};

const OPERATIONAL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

/**
 * Reads the wall-clock date/time an instant renders as in `timeZone`, via
 * `Intl.DateTimeFormat`. Uses `hourCycle: 'h23'` rather than `hour12: false` —
 * some ICU builds mishandle midnight under `hour12: false`, formatting it as
 * hour `24` instead of `00`.
 */
function getZonedParts(instant: Date, timeZone: string): ZonedParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const values: Partial<Record<Intl.DateTimeFormatPartTypes, number>> = {};
  for (const part of formatter.formatToParts(instant)) {
    if (part.type !== 'literal') {
      values[part.type] = Number(part.value);
    }
  }

  return {
    year: values.year!,
    month: values.month!,
    day: values.day!,
    hour: values.hour!,
    minute: values.minute!,
    second: values.second!,
  };
}

function zonedPartsToUtcMs(parts: ZonedParts): number {
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
}

/** The IANA offset (in ms, east-of-UTC positive) `timeZone` observes at `utcMs`. */
function getOffsetMs(utcMs: number, timeZone: string): number {
  const parts = getZonedParts(new Date(utcMs), timeZone);
  return zonedPartsToUtcMs(parts) - utcMs;
}

/**
 * Resolves a local wall-clock date/time in `timeZone` to the UTC instant it
 * represents. Two-pass guess-then-correct: an offset computed from an initial
 * guess can itself be wrong near a DST transition, so a second pass
 * re-derives the offset from the corrected instant. Never uses
 * `new Date(y, m, d, ...)` or other host-local `Date` accessors — those read
 * the *server's* local timezone, not the target IANA zone.
 */
function zonedWallClockToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string,
): Date {
  const wallAsUtcMs = Date.UTC(year, month - 1, day, hour, minute, second);
  const offset1 = getOffsetMs(wallAsUtcMs, timeZone);
  let utcMs = wallAsUtcMs - offset1;

  const offset2 = getOffsetMs(utcMs, timeZone);
  if (offset2 !== offset1) {
    utcMs = wallAsUtcMs - offset2;
  }

  return new Date(utcMs);
}

function addUtcCalendarDays(
  year: number,
  month: number,
  day: number,
  delta: number,
): { year: number; month: number; day: number } {
  const shifted = new Date(Date.UTC(year, month - 1, day + delta));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

function formatDateKey(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseOperationalDate(operationalDate: string): { year: number; month: number; day: number } {
  if (!OPERATIONAL_DATE_PATTERN.test(operationalDate)) {
    throw new Error('INVALID_OPERATIONAL_DATE');
  }

  const [year, month, day] = operationalDate.split('-').map(Number);
  // Round-trip through a UTC calendar probe to reject calendar-invalid dates
  // (e.g. 2026-02-30, 2026-13-01) that a bare regex cannot catch — `Date.UTC`
  // silently normalizes overflowing month/day components instead of erroring.
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    probe.getUTCFullYear() !== year
    || probe.getUTCMonth() !== month - 1
    || probe.getUTCDate() !== day
  ) {
    throw new Error('INVALID_OPERATIONAL_DATE');
  }

  return { year, month, day };
}

function assertValidTimeZone(timeZone: string): void {
  try {
    // Probes IANA zone validity; throws RangeError for an unresolvable zone.
    const formatter = new Intl.DateTimeFormat('en-US', { timeZone });
    formatter.resolvedOptions();
  } catch {
    throw new Error('INVALID_OPERATIONAL_TIMEZONE');
  }
}

/**
 * Resolves the exact UTC bounds of one operational day. Half-open: query with
 * `{ gte: windowStart, lt: windowEnd }`. DST-safe — `windowStart` and
 * `windowEnd` are resolved as two independent instants, so a window spanning
 * a DST transition is 23h or 25h, never a naive fixed 24h.
 *
 * Throws `Error('INVALID_OPERATIONAL_DATE')` / `Error('INVALID_OPERATIONAL_TIMEZONE')`
 * for malformed input — plain `Error`s, not `HttpError`. This is
 * defense-in-depth: the Zod boundary owns the 400 response; this utility must
 * still refuse to silently fall back to UTC or the host timezone.
 */
export function resolveOperationalWindow(operationalDate: string, timeZone: string): OperationalWindow {
  const { year, month, day } = parseOperationalDate(operationalDate);
  assertValidTimeZone(timeZone);

  const windowStart = zonedWallClockToUtc(year, month, day, OPERATIONAL_DAY_START_HOUR, 0, 0, timeZone);
  const nextDay = addUtcCalendarDays(year, month, day, 1);
  const windowEnd = zonedWallClockToUtc(
    nextDay.year,
    nextDay.month,
    nextDay.day,
    OPERATIONAL_DAY_START_HOUR,
    0,
    0,
    timeZone,
  );

  return { operationalDate, windowStart, windowEnd, timezone: timeZone };
}

/**
 * Inverse of {@link resolveOperationalWindow}: which `YYYY-MM-DD` operational
 * date owns `instant` in `timeZone`. An instant at or after local
 * {@link OPERATIONAL_DAY_START_HOUR}:00 belongs to that calendar date;
 * earlier belongs to the previous calendar date.
 */
export function resolveOperationalDate(instant: Date, timeZone: string): string {
  assertValidTimeZone(timeZone);

  const parts = getZonedParts(instant, timeZone);
  const localMinutesOfDay = parts.hour * 60 + parts.minute;
  const startMinutes = OPERATIONAL_DAY_START_HOUR * 60;

  if (localMinutesOfDay >= startMinutes) {
    return formatDateKey(parts.year, parts.month, parts.day);
  }

  const previousDay = addUtcCalendarDays(parts.year, parts.month, parts.day, -1);
  return formatDateKey(previousDay.year, previousDay.month, previousDay.day);
}
