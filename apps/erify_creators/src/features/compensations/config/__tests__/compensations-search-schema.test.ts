import { describe, expect, it } from 'vitest';

import { compensationsSearchSchema, getInitialDateRange } from '../compensations-search-schema';

describe('compensationsSearchSchema', () => {
  it('parses valid date search parameters', () => {
    const parsed = compensationsSearchSchema.parse({
      dateFrom: '2026-05-01T00:00:00.000Z',
      dateTo: '2026-05-31T23:59:59.999Z',
    });

    expect(parsed.dateFrom).toBe('2026-05-01T00:00:00.000Z');
    expect(parsed.dateTo).toBe('2026-05-31T23:59:59.999Z');
  });

  it('handles missing or empty search parameters safely', () => {
    const parsed = compensationsSearchSchema.parse({});

    expect(parsed.dateFrom).toBeUndefined();
    expect(parsed.dateTo).toBeUndefined();
  });

  it('catches and falls back on invalid parameters', () => {
    const parsed = compensationsSearchSchema.parse({
      dateFrom: 12345, // invalid type
      dateTo: { date: '2026' }, // invalid type
    });

    expect(parsed.dateFrom).toBeUndefined();
    expect(parsed.dateTo).toBeUndefined();
  });
});

describe('getInitialDateRange', () => {
  it('returns a valid 30-day ISO date range window', () => {
    const range = getInitialDateRange();

    expect(range.dateFrom).toBeDefined();
    expect(range.dateTo).toBeDefined();

    const fromTime = new Date(range.dateFrom).getTime();
    const toTime = new Date(range.dateTo).getTime();

    // Verify it is roughly a 30-day difference (30 days * 24 hours * 60 mins * 60 secs * 1000 ms)
    const diffDays = Math.round((toTime - fromTime) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(31);
  });
});
