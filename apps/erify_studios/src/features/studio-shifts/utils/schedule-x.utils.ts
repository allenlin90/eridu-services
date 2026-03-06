import type { Temporal as TemporalNamespace } from 'temporal-polyfill';

const ISO_WITH_OFFSET_OR_Z_REGEX = /(?:Z|[+-]\d{2}:\d{2})$/i;

function getRuntimeTimeZone(temporal: TemporalNamespace): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || temporal.Now.timeZoneId();
}

function toInstant(temporal: TemporalNamespace, value: string | Date): TemporalNamespace.Instant {
  if (value instanceof Date) {
    return temporal.Instant.fromEpochMilliseconds(value.getTime());
  }

  if (ISO_WITH_OFFSET_OR_Z_REGEX.test(value)) {
    return temporal.Instant.from(value);
  }

  const runtimeTimeZone = getRuntimeTimeZone(temporal);
  return temporal.PlainDateTime.from(value).toZonedDateTime(runtimeTimeZone).toInstant();
}

/**
 * Schedule-X expects Temporal types for event boundaries.
 * Keep Temporal isolated to this adapter so domain/form utilities stay Date/string based.
 */
export function toScheduleXDateTime(value: string | Date) {
  const temporal = (globalThis as typeof globalThis & { Temporal?: TemporalNamespace }).Temporal;
  if (!temporal) {
    throw new Error('Temporal API is not available. Ensure temporal-polyfill/global is loaded.');
  }

  const runtimeTimeZone = getRuntimeTimeZone(temporal);
  return toInstant(temporal, value).toZonedDateTimeISO(runtimeTimeZone);
}
