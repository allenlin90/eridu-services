import {
  deriveClientOffsetMs,
  OPERATIONAL_DAY_START_HOUR,
  toOperationalDayKey,
} from './operational-day.util';

describe('operationalDayUtil', () => {
  describe('deriveClientOffsetMs', () => {
    it('recovers UTC+7 from a 06:00-local start_date sent as 23:00Z the prior day', () => {
      // 2026-06-01 06:00 in UTC+7 === 2026-05-31 23:00Z
      const startDate = new Date('2026-05-31T23:00:00.000Z');
      expect(deriveClientOffsetMs(startDate)).toBe(7 * 60 * 60 * 1000);
    });

    it('returns a zero offset for a UTC studio whose day starts at 06:00Z', () => {
      const startDate = new Date('2026-06-01T06:00:00.000Z');
      expect(deriveClientOffsetMs(startDate)).toBe(0);
    });

    it('recovers a negative offset (UTC-5) without reading it as ~±24h', () => {
      // 2026-06-01 06:00 in UTC-5 === 2026-06-01 11:00Z
      const startDate = new Date('2026-06-01T11:00:00.000Z');
      expect(deriveClientOffsetMs(startDate)).toBe(-5 * 60 * 60 * 1000);
    });
  });

  describe('toOperationalDayKey', () => {
    const offsetMs = 7 * 60 * 60 * 1000; // UTC+7

    it('buckets a mid-day instant into its local operational day', () => {
      // 2026-06-02 12:00 local (UTC+7) === 2026-06-02 05:00Z
      const instant = new Date('2026-06-02T05:00:00.000Z');
      expect(toOperationalDayKey(instant, offsetMs)).toBe('2026-06-02');
    });

    it('buckets an after-midnight instant before the start hour into the previous day', () => {
      // 2026-06-03 03:00 local (UTC+7) === 2026-06-02 20:00Z — before 06:00 start
      const instant = new Date('2026-06-02T20:00:00.000Z');
      expect(toOperationalDayKey(instant, offsetMs)).toBe('2026-06-02');
    });

    it('buckets an instant exactly at the start hour into the new day', () => {
      // 2026-06-03 06:00 local (UTC+7) === 2026-06-02 23:00Z
      const instant = new Date('2026-06-02T23:00:00.000Z');
      expect(toOperationalDayKey(instant, offsetMs)).toBe('2026-06-03');
    });
  });

  it('exposes the operational day start hour constant', () => {
    expect(OPERATIONAL_DAY_START_HOUR).toBe(6);
  });
});
