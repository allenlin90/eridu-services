import type { Temporal as TemporalNamespace } from 'temporal-polyfill';

/**
 * Schedule-X expects Temporal types for event boundaries.
 * Keep Temporal isolated to this adapter so domain/form utilities stay Date/string based.
 */
export function toScheduleXDateTime(value: string | Date) {
  const temporal = (globalThis as typeof globalThis & { Temporal?: TemporalNamespace }).Temporal;
  if (!temporal) {
    throw new Error('Temporal API is not available. Ensure temporal-polyfill/global is loaded.');
  }

  const isoString = value instanceof Date ? value.toISOString() : new Date(value).toISOString();
  return temporal.Instant.from(isoString).toZonedDateTimeISO(temporal.Now.timeZoneId());
}
