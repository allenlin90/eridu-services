import {
  resolveMcpCalendarDate,
  resolveMcpOperationalDateRange,
} from './mcp-operational-date-range.util';

describe('resolveMcpOperationalDateRange', () => {
  it('resolves YYYY-MM-DD operational dates to 6am-to-6am UTC ISO range (UTC+7)', () => {
    expect(
      resolveMcpOperationalDateRange({
        dateFrom: '2026-06-28',
        dateTo: '2026-06-28',
      }),
    ).toEqual({
      dateFrom: '2026-06-27T23:00:00.000Z',
      dateTo: '2026-06-28T22:59:59.999Z',
    });
  });

  it('handles open-ended range queries gracefully', () => {
    expect(
      resolveMcpOperationalDateRange({
        dateFrom: '2026-06-28',
      }),
    ).toEqual({
      dateFrom: '2026-06-27T23:00:00.000Z',
      dateTo: undefined,
    });

    expect(
      resolveMcpOperationalDateRange({
        dateTo: '2026-06-28',
      }),
    ).toEqual({
      dateFrom: undefined,
      dateTo: '2026-06-28T22:59:59.999Z',
    });
  });

  it('returns undefined bounds when no input is provided', () => {
    expect(resolveMcpOperationalDateRange({})).toEqual({
      dateFrom: undefined,
      dateTo: undefined,
    });
  });
});

describe('resolveMcpCalendarDate', () => {
  it('resolves YYYY-MM-DD calendar start and end dates to UTC+7 boundaries', () => {
    // Start of local 2026-06-28 is 00:00:00 local, which is 2026-06-27 17:00:00 UTC
    const start = resolveMcpCalendarDate('2026-06-28', false);
    expect(start.toISOString()).toBe('2026-06-27T17:00:00.000Z');

    // End of local 2026-06-28 is 23:59:59.999 local, which is 2026-06-28 16:59:59.999 UTC
    const end = resolveMcpCalendarDate('2026-06-28', true);
    expect(end.toISOString()).toBe('2026-06-28T16:59:59.999Z');
  });
});
