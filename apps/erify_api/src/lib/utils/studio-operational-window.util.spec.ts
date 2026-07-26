import {
  assertOperationalDate,
  isValidIanaTimeZone,
  resolveOperationalWindow,
  toOperationalDate,
} from './studio-operational-window.util';

/** Generates `count` consecutive `YYYY-MM-DD` date strings starting at `start`. */
function consecutiveDates(start: string, count: number): string[] {
  const [year, month, day] = start.split('-').map(Number);
  const dates: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const d = new Date(Date.UTC(year, month - 1, day + i));
    dates.push(
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`,
    );
  }
  return dates;
}

describe('resolveOperationalWindow', () => {
  it('resolves the exact 06:00-05:59 UTC+7 boundary for Asia/Bangkok', () => {
    const window = resolveOperationalWindow('2026-01-15', 'Asia/Bangkok');

    expect(window.windowStart.toISOString()).toBe('2026-01-14T23:00:00.000Z');
    expect(window.windowEnd.toISOString()).toBe('2026-01-15T22:59:59.999Z');
    expect(window.operationalDate).toBe('2026-01-15');
    expect(window.timeZone).toBe('Asia/Bangkok');
  });

  it('produces the same window regardless of the host process.env.TZ', () => {
    // Deliberately mutates the host TZ to prove the resolver never depends on
    // it (only on the explicit `timeZone` argument).
    // eslint-disable-next-line node/no-process-env
    const originalTz = process.env.TZ;
    const results: string[] = [];

    try {
      for (const tz of ['UTC', 'America/New_York', 'Asia/Bangkok']) {
        // eslint-disable-next-line node/no-process-env -- see above.
        process.env.TZ = tz;
        const window = resolveOperationalWindow('2026-06-01', 'Asia/Bangkok');
        results.push(`${window.windowStart.toISOString()}|${window.windowEnd.toISOString()}`);
      }
    } finally {
      // eslint-disable-next-line node/no-process-env -- see above.
      process.env.TZ = originalTz;
    }

    expect(new Set(results).size).toBe(1);
  });

  it('windowEnd is exactly the next day\'s windowStart minus 1ms', () => {
    const day1 = resolveOperationalWindow('2026-06-01', 'Asia/Bangkok');
    const day2 = resolveOperationalWindow('2026-06-02', 'Asia/Bangkok');

    expect(day1.windowEnd.getTime()).toBe(day2.windowStart.getTime() - 1);
  });

  it('resolves both sides of the Europe/London spring-forward transition without gaps or overlaps', () => {
    // Covers the UK's last-Sunday-of-March BST transition without hardcoding
    // its exact date; the continuity assertion below is the real check.
    const dates = consecutiveDates('2026-03-20', 20);
    const windows = dates.map((date) => resolveOperationalWindow(date, 'Europe/London'));

    for (let i = 0; i < windows.length - 1; i += 1) {
      expect(windows[i].windowEnd.getTime() + 1).toBe(windows[i + 1].windowStart.getTime());
    }

    // GMT (UTC+0) before the transition, BST (UTC+1) after it.
    expect(windows[0].windowStart.getUTCHours()).toBe(6);
    expect(windows[windows.length - 1].windowStart.getUTCHours()).toBe(5);
  });

  it('resolves both sides of the Europe/London fall-back transition without gaps or overlaps', () => {
    // Covers the UK's last-Sunday-of-October GMT transition without
    // hardcoding its exact date.
    const dates = consecutiveDates('2026-10-18', 20);
    const windows = dates.map((date) => resolveOperationalWindow(date, 'Europe/London'));

    for (let i = 0; i < windows.length - 1; i += 1) {
      expect(windows[i].windowEnd.getTime() + 1).toBe(windows[i + 1].windowStart.getTime());
    }

    // BST (UTC+1) before the transition, GMT (UTC+0) after it.
    expect(windows[0].windowStart.getUTCHours()).toBe(5);
    expect(windows[windows.length - 1].windowStart.getUTCHours()).toBe(6);
  });

  it('rejects a malformed operational_date', () => {
    expect(() => resolveOperationalWindow('2026-13-40', 'Asia/Bangkok')).toThrow();
    expect(() => resolveOperationalWindow('not-a-date', 'Asia/Bangkok')).toThrow();
    expect(() => resolveOperationalWindow('2026/01/15', 'Asia/Bangkok')).toThrow();
  });

  it('rejects an unknown IANA timezone identifier', () => {
    expect(() => resolveOperationalWindow('2026-01-15', 'Not/AZone')).toThrow();
  });
});

describe('assertOperationalDate', () => {
  it('accepts a valid calendar date', () => {
    expect(assertOperationalDate('2026-02-28')).toBe('2026-02-28');
  });

  it('rejects a non-existent calendar date', () => {
    expect(() => assertOperationalDate('2026-02-30')).toThrow();
  });

  it('rejects a non YYYY-MM-DD shaped string', () => {
    expect(() => assertOperationalDate('2026-1-1')).toThrow();
    expect(() => assertOperationalDate('2026-01-15T00:00:00Z')).toThrow();
  });
});

describe('isValidIanaTimeZone', () => {
  it('returns true for a known IANA identifier', () => {
    expect(isValidIanaTimeZone('Asia/Bangkok')).toBe(true);
  });

  it('returns false for an unknown identifier without throwing', () => {
    expect(isValidIanaTimeZone('Not/AZone')).toBe(false);
  });
});

describe('toOperationalDate', () => {
  it('buckets an instant before the local start hour into the previous operational day', () => {
    // 2026-01-15T02:00:00Z is 2026-01-15T09:00 Bangkok — after 06:00, same day.
    expect(toOperationalDate(new Date('2026-01-15T02:00:00Z'), 'Asia/Bangkok')).toBe('2026-01-15');
    // 2026-01-15T22:00:00Z is 2026-01-16T05:00 Bangkok — before 06:00, previous operational day.
    expect(toOperationalDate(new Date('2026-01-15T22:00:00Z'), 'Asia/Bangkok')).toBe('2026-01-15');
  });

  it('round-trips with resolveOperationalWindow across the window bounds', () => {
    const window = resolveOperationalWindow('2026-06-15', 'Asia/Bangkok');

    expect(toOperationalDate(window.windowStart, 'Asia/Bangkok')).toBe('2026-06-15');
    expect(toOperationalDate(window.windowEnd, 'Asia/Bangkok')).toBe('2026-06-15');
    expect(toOperationalDate(new Date(window.windowEnd.getTime() + 1), 'Asia/Bangkok')).toBe('2026-06-16');
  });
});
