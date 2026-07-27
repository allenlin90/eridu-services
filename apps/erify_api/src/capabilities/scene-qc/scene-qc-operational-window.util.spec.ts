import {
  OPERATIONAL_TIMEZONE,
  resolveOperationalDate,
  resolveOperationalWindow,
} from './scene-qc-operational-window.util';

import { OPERATIONAL_DAY_START_HOUR } from '@/lib/utils/operational-day.util';

const HOUR_MS = 60 * 60 * 1000;

describe('scene-qc operational window (no TZ env pinning required)', () => {
  it('uses Asia/Bangkok as the Stage 1 shared operational timezone', () => {
    expect(OPERATIONAL_TIMEZONE).toBe('Asia/Bangkok');
  });

  it('starts the operational day at the shared OPERATIONAL_DAY_START_HOUR constant', () => {
    const window = resolveOperationalWindow('2026-06-01', 'UTC');
    expect(window.windowStart.getUTCHours()).toBe(OPERATIONAL_DAY_START_HOUR);
  });

  it('resolves exact UTC bounds for Asia/Bangkok (fixed UTC+7, no DST)', () => {
    const window = resolveOperationalWindow('2026-06-01', 'Asia/Bangkok');

    expect(window.windowStart.toISOString()).toBe('2026-05-31T23:00:00.000Z');
    expect(window.windowEnd.toISOString()).toBe('2026-06-01T23:00:00.000Z');
    expect(window.windowEnd.getTime() - window.windowStart.getTime()).toBe(24 * HOUR_MS);
    expect(window.timezone).toBe('Asia/Bangkok');
    expect(window.operationalDate).toBe('2026-06-01');
  });

  it('resolves exact UTC bounds for the UTC zone itself', () => {
    const window = resolveOperationalWindow('2026-06-01', 'UTC');

    expect(window.windowStart.toISOString()).toBe('2026-06-01T06:00:00.000Z');
    expect(window.windowEnd.toISOString()).toBe('2026-06-02T06:00:00.000Z');
    expect(window.windowEnd.getTime() - window.windowStart.getTime()).toBe(24 * HOUR_MS);
  });

  it('produces a 23-hour window across the America/New_York spring-forward transition (2026-03-08 02:00 -> 03:00)', () => {
    const window = resolveOperationalWindow('2026-03-07', 'America/New_York');

    expect(window.windowEnd.getTime() - window.windowStart.getTime()).toBe(23 * HOUR_MS);
  });

  it('produces a 25-hour window across the America/New_York fall-back transition (2026-11-01 02:00 -> 01:00)', () => {
    const window = resolveOperationalWindow('2026-10-31', 'America/New_York');

    expect(window.windowEnd.getTime() - window.windowStart.getTime()).toBe(25 * HOUR_MS);
  });

  it('produces minute-granular bounds for a non-whole-hour-offset zone (Asia/Kathmandu, +05:45)', () => {
    const window = resolveOperationalWindow('2026-06-01', 'Asia/Kathmandu');

    // 06:00 Kathmandu (+05:45) = 00:15 UTC same day.
    expect(window.windowStart.toISOString()).toBe('2026-06-01T00:15:00.000Z');
    expect(window.windowEnd.toISOString()).toBe('2026-06-02T00:15:00.000Z');
  });

  it('produces different absolute bounds for different zones on the same date and does not leak cached offsets between calls', () => {
    const bangkok = resolveOperationalWindow('2026-06-01', 'Asia/Bangkok');
    const kathmandu = resolveOperationalWindow('2026-06-01', 'Asia/Kathmandu');
    const backToBangkok = resolveOperationalWindow('2026-06-01', 'Asia/Bangkok');

    expect(bangkok.windowStart.getTime()).not.toBe(kathmandu.windowStart.getTime());
    expect(backToBangkok.windowStart.toISOString()).toBe(bangkok.windowStart.toISOString());
  });

  describe('malformed operational_date rejection', () => {
    it.each(['2026-6-1', '2026-02-30', '2026-13-01', '', '2026-06-01T00:00:00Z'])(
      'rejects %s with INVALID_OPERATIONAL_DATE',
      (value) => {
        expect(() => resolveOperationalWindow(value, 'Asia/Bangkok')).toThrow('INVALID_OPERATIONAL_DATE');
      },
    );
  });

  it('rejects an unresolvable timezone with INVALID_OPERATIONAL_TIMEZONE — no silent UTC fallback', () => {
    expect(() => resolveOperationalWindow('2026-06-01', 'Mars/Phobos')).toThrow('INVALID_OPERATIONAL_TIMEZONE');
  });

  describe('resolveOperationalDate (inverse mapping)', () => {
    it('maps an instant well inside the operational day back to that date', () => {
      expect(resolveOperationalDate(new Date('2026-06-01T12:00:00.000Z'), 'Asia/Bangkok')).toBe('2026-06-01');
    });

    it('maps an instant exactly at the window start boundary to that date (inclusive)', () => {
      expect(resolveOperationalDate(new Date('2026-05-31T23:00:00.000Z'), 'Asia/Bangkok')).toBe('2026-06-01');
    });

    it('maps an instant exactly at the window end boundary to the next date (exclusive from the prior day)', () => {
      expect(resolveOperationalDate(new Date('2026-06-01T23:00:00.000Z'), 'Asia/Bangkok')).toBe('2026-06-02');
    });

    it('maps an instant just before the window start to the previous date', () => {
      expect(resolveOperationalDate(new Date('2026-05-31T22:59:59.999Z'), 'Asia/Bangkok')).toBe('2026-05-31');
    });

    it('rejects an unresolvable timezone', () => {
      expect(() => resolveOperationalDate(new Date(), 'Mars/Phobos')).toThrow('INVALID_OPERATIONAL_TIMEZONE');
    });

    it.each([
      ['2026-06-01', 'Asia/Bangkok'],
      ['2026-06-01', 'UTC'],
      ['2026-06-01', 'Asia/Kathmandu'],
      ['2026-03-07', 'America/New_York'],
      ['2026-10-31', 'America/New_York'],
    ])('round-trips windowStart -> date and windowEnd -> next date for %s in %s', (date, timeZone) => {
      const window = resolveOperationalWindow(date, timeZone);

      expect(resolveOperationalDate(window.windowStart, timeZone)).toBe(date);

      const nextDateKey = resolveOperationalDate(window.windowEnd, timeZone);
      const expectedNext = new Date(`${date}T00:00:00.000Z`);
      expectedNext.setUTCDate(expectedNext.getUTCDate() + 1);
      expect(nextDateKey).toBe(expectedNext.toISOString().slice(0, 10));
    });
  });
});
