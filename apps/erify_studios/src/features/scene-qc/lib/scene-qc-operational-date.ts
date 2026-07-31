import { SCENE_QC_OPERATIONAL_DAY_START_HOUR, SCENE_QC_OPERATIONAL_TIMEZONE } from '@eridu/api-types/scene-qc';

/**
 * Scene-QC-specific operational-day helpers. Deliberately separate from
 * `@/lib/operational-day-range` (which reads the *browser's* local calendar
 * via `date.getFullYear()` etc.) -- Scene QC's date selection must use the
 * server-authoritative operational-timezone constant regardless of the
 * viewer's browser timezone. See "Operational day" in
 * apps/erify_studios/docs/SCENE_QC.md. Do not extend
 * `operational-day-range.ts`: other surfaces depend on its current
 * browser-local semantics.
 */

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

type ZonedParts = { year: number; month: number; day: number; hour: number; minute: number };

function getZonedParts(instant: Date, timeZone: string): ZonedParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
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
  };
}

function formatDateKey(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function addUtcCalendarDays(dateInput: string, delta: number): string {
  const [year, month, day] = dateInput.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + delta));
  return formatDateKey(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate());
}

/**
 * The `YYYY-MM-DD` operational date `instant` belongs to in the shared
 * Scene QC operational timezone -- an instant at or after local
 * {@link SCENE_QC_OPERATIONAL_DAY_START_HOUR}:00 belongs to that calendar
 * date; earlier belongs to the previous calendar date. Mirrors the backend's
 * `resolveOperationalDate` in `scene-qc-operational-window.util.ts`.
 */
export function getCurrentOperationalDate(now: Date = new Date()): string {
  const parts = getZonedParts(now, SCENE_QC_OPERATIONAL_TIMEZONE);
  const localMinutesOfDay = parts.hour * 60 + parts.minute;
  const startMinutes = SCENE_QC_OPERATIONAL_DAY_START_HOUR * 60;

  if (localMinutesOfDay >= startMinutes) {
    return formatDateKey(parts.year, parts.month, parts.day);
  }
  return addUtcCalendarDays(formatDateKey(parts.year, parts.month, parts.day), -1);
}

/** Shifts an operational-date bucket key by whole calendar days (±1 for prev/next-day navigation). */
export function shiftOperationalDate(operationalDate: string, deltaDays: number): string {
  if (!DATE_PATTERN.test(operationalDate)) {
    throw new Error(`Invalid operational date: ${operationalDate}`);
  }
  return addUtcCalendarDays(operationalDate, deltaDays);
}
