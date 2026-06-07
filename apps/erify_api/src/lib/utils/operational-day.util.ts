/**
 * Shared helpers for bucketing UTC instants into a studio's local "operational
 * day". An operational day starts at {@link OPERATIONAL_DAY_START_HOUR} local
 * time (so a show at 03:00 local belongs to the *previous* calendar day) and is
 * consumed by both the performance and costs analytics services. Keep this in
 * sync with the frontend's `@/lib/operational-day-range` helper.
 */

/**
 * The hour (in the studio's local "operational" timezone) at which a new
 * operational day begins. Mirrors the frontend's `OPERATIONAL_DAY_START_HOUR`.
 */
export const OPERATIONAL_DAY_START_HOUR = 6;

/**
 * Derives the client's UTC offset (in ms) from the `start_date` query param.
 *
 * CONTRACT: the frontend always sends `start_date` at exactly the start of an
 * operational day — i.e. its local time-of-day is {@link OPERATIONAL_DAY_START_HOUR}
 * (06:00). We recover the offset from the gap between that fixed local hour and
 * the value's UTC time-of-day, which avoids threading an explicit timezone
 * param through the API. This is brittle by design: if the frontend ever sends
 * a `start_date` whose local time is not 06:00 the trend buckets shift. A
 * single offset is applied across the whole range (no DST handling), which is
 * correct for the fixed-offset locales we serve (e.g. Asia/Bangkok, UTC+7).
 */
export function deriveClientOffsetMs(startDate: Date): number {
  const utcTimeInMinutes = startDate.getUTCHours() * 60 + startDate.getUTCMinutes();
  const localTimeInMinutes = OPERATIONAL_DAY_START_HOUR * 60;
  let offsetInMinutes = localTimeInMinutes - utcTimeInMinutes;
  // Normalize into (-12h, +12h] so a value near the UTC day boundary doesn't
  // read as a ~±24h offset (e.g. UTC+7 sent as 23:00Z the previous day).
  if (offsetInMinutes > 720) {
    offsetInMinutes -= 1440;
  } else if (offsetInMinutes < -720) {
    offsetInMinutes += 1440;
  }
  return offsetInMinutes * 60 * 1000;
}

/**
 * Maps a UTC instant to its operational-day key (`YYYY-MM-DD`) in the client's
 * local timezone, where each operational day starts at
 * {@link OPERATIONAL_DAY_START_HOUR}. Shifting by the start hour before taking
 * the date portion means a show at 03:00 local lands in the prior day's bucket.
 */
export function toOperationalDayKey(instant: Date, offsetMs: number): string {
  const startHourMs = OPERATIONAL_DAY_START_HOUR * 60 * 60 * 1000;
  return new Date(instant.getTime() + offsetMs - startHourMs)
    .toISOString()
    .slice(0, 10);
}
