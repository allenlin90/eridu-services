/**
 * Server-authoritative resolution of a Studio's local "operational day"
 * (06:00-05:59 local) into exact UTC instants, from the Studio's own
 * canonical IANA `timezone` column. Every Scene QC daily query, review
 * command, and confirmation resolves its window through this module so two
 * operators in different browser timezones agree on the same Studio/date
 * scope. See docs/prd/scene-qc.md and
 * apps/erify_api/docs/design/SCENE_QC_IMPLEMENTATION_PLAN.md §5/§8.
 *
 * This is intentionally a separate, zero-dependency utility from
 * `operational-day.util.ts`: that module buckets analytics rows from a
 * frontend-supplied `start_date` and a derived fixed UTC offset (no per-Studio
 * timezone, no DST handling) and its offset-derivation contract stays
 * untouched. Scene QC needs a real IANA-aware, DST-safe conversion driven by
 * a persisted Studio timezone, so the two utilities intentionally do not
 * share an implementation even though both start at 06:00 local. `erify_api`
 * has no date/timezone library dependency; this module uses only `Intl`.
 */

import { HttpError } from '@/lib/errors/http-error.util';

/** Mirrors `operational-day.util.ts`'s `OPERATIONAL_DAY_START_HOUR` value, intentionally duplicated — see module doc above. */
export const OPERATIONAL_DAY_START_HOUR = 6;

const OPERATIONAL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type OperationalWindow = {
  /** The validated `YYYY-MM-DD` operational date this window resolves. */
  operationalDate: string;
  /** UTC instant of local 06:00:00.000 on `operationalDate`. */
  windowStart: Date;
  /** UTC instant of local 05:59:59.999 on the following calendar day. */
  windowEnd: Date;
  /** The IANA identifier used to resolve this window, echoed back. */
  timeZone: string;
};

type DateParts = { year: number; month: number; day: number };
type TimeParts = DateParts & { hour: number; minute: number; second: number };

/**
 * Validates only — never throws. The caller (a capability service) decides
 * how to surface an invalid IANA identifier (typically `HttpError.badRequest`).
 */
export function isValidIanaTimeZone(timeZone: string): boolean {
  try {
    // eslint-disable-next-line no-new -- construction itself is the validation; the formatter is discarded.
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Asserts `value` is a `YYYY-MM-DD` calendar date (rejects malformed strings
 * and non-existent dates such as `2026-02-30`). Throws `HttpError.badRequest`
 * directly — this validates untrusted `operational_date` request input, so
 * every caller would otherwise have to re-wrap the same check.
 */
export function assertOperationalDate(value: string): string {
  if (!OPERATIONAL_DATE_PATTERN.test(value)) {
    throw HttpError.badRequest(`Invalid operational_date: ${value}`);
  }

  const [year, month, day] = value.split('-').map(Number);
  const asUtc = new Date(Date.UTC(year, month - 1, day));
  if (
    asUtc.getUTCFullYear() !== year
    || asUtc.getUTCMonth() !== month - 1
    || asUtc.getUTCDate() !== day
  ) {
    throw HttpError.badRequest(`Invalid operational_date: ${value}`);
  }

  return value;
}

function parseDateParts(value: string): DateParts {
  const [year, month, day] = value.split('-').map(Number);
  return { year, month, day };
}

function addCalendarDay(parts: DateParts): DateParts {
  const next = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + 1));
  return { year: next.getUTCFullYear(), month: next.getUTCMonth() + 1, day: next.getUTCDate() };
}

function formatPartsInZone(instant: Date, timeZone: string): TimeParts {
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

  const map: Record<string, string> = {};
  for (const part of formatter.formatToParts(instant)) {
    if (part.type !== 'literal') {
      map[part.type] = part.value;
    }
  }

  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    // Some Intl implementations render local midnight as "24" even under
    // hourCycle "h23"; normalize defensively.
    hour: map.hour === '24' ? 0 : Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

function timePartsToUtcMillis(parts: TimeParts): number {
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
}

/**
 * Converts a wall-clock time in `timeZone` to the exact UTC instant it
 * denotes. Uses the standard guess-format-correct algorithm: treat the wall
 * clock as if it were UTC, see what that guess instant actually reads as in
 * the target zone, and shift by the difference — applied twice so a DST
 * transition landing between the first guess and the corrected instant is
 * also resolved. A single correction can be wrong by a full DST offset when
 * the guess and the true instant fall on opposite sides of a transition.
 */
function zonedWallClockToUtc(target: TimeParts, timeZone: string): Date {
  const desiredMs = timePartsToUtcMillis(target);
  let guessMs = desiredMs;

  for (let i = 0; i < 2; i += 1) {
    const observed = formatPartsInZone(new Date(guessMs), timeZone);
    const observedMs = timePartsToUtcMillis(observed);
    guessMs += desiredMs - observedMs;
  }

  return new Date(guessMs);
}

/**
 * Resolves the exact UTC `[windowStart, windowEnd]` bounds of one Studio
 * operational day. Throws `HttpError.badRequest` for a malformed
 * `operationalDate` or an unresolvable `timeZone`.
 */
export function resolveOperationalWindow(operationalDate: string, timeZone: string): OperationalWindow {
  assertOperationalDate(operationalDate);

  if (!isValidIanaTimeZone(timeZone)) {
    throw HttpError.badRequest(`Invalid IANA timezone: ${timeZone}`);
  }

  const startDate = parseDateParts(operationalDate);
  const nextDate = addCalendarDay(startDate);

  const windowStart = zonedWallClockToUtc(
    { ...startDate, hour: OPERATIONAL_DAY_START_HOUR, minute: 0, second: 0 },
    timeZone,
  );
  const nextWindowStart = zonedWallClockToUtc(
    { ...nextDate, hour: OPERATIONAL_DAY_START_HOUR, minute: 0, second: 0 },
    timeZone,
  );
  const windowEnd = new Date(nextWindowStart.getTime() - 1);

  return { operationalDate, windowStart, windowEnd, timeZone };
}

/**
 * Maps a UTC instant to the `YYYY-MM-DD` operational date it belongs to in
 * `timeZone`, where a day starts at local {@link OPERATIONAL_DAY_START_HOUR}.
 * An instant before that local hour belongs to the previous calendar day.
 */
export function toOperationalDate(instant: Date, timeZone: string): string {
  const local = formatPartsInZone(instant, timeZone);
  const calendarDate = local.hour < OPERATIONAL_DAY_START_HOUR
    ? new Date(Date.UTC(local.year, local.month - 1, local.day - 1))
    : new Date(Date.UTC(local.year, local.month - 1, local.day));

  const year = String(calendarDate.getUTCFullYear()).padStart(4, '0');
  const month = String(calendarDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(calendarDate.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}
