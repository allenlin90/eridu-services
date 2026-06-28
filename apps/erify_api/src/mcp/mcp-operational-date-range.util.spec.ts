import { resolveMcpOperationalDateRange } from './mcp-operational-date-range.util';

describe('resolveMcpOperationalDateRange', () => {
  it('keeps explicit ISO date ranges unchanged', () => {
    expect(resolveMcpOperationalDateRange({
      dateFrom: '2026-06-28T06:00:00+07:00',
      dateTo: '2026-06-29T05:59:59.999+07:00',
    })).toEqual({
      dateFrom: '2026-06-28T06:00:00+07:00',
      dateTo: '2026-06-29T05:59:59.999+07:00',
    });
  });

  it('resolves a GMT+7 operational date to a 6am-to-6am UTC ISO range', () => {
    expect(resolveMcpOperationalDateRange({
      operationalDate: '2026-06-28',
      timezoneOffsetMinutes: 420,
      operationalDayStartHour: 6,
    })).toEqual({
      dateFrom: '2026-06-27T23:00:00.000Z',
      dateTo: '2026-06-28T22:59:59.999Z',
    });
  });

  it('resolves today from the caller timezone offset before applying the operational window', () => {
    expect(resolveMcpOperationalDateRange(
      {
        datePreset: 'today',
        timezoneOffsetMinutes: 420,
        operationalDayStartHour: 6,
      },
      new Date('2026-06-27T18:00:00.000Z'),
    )).toEqual({
      dateFrom: '2026-06-27T23:00:00.000Z',
      dateTo: '2026-06-28T22:59:59.999Z',
    });
  });

  it('returns no bounds when no date input is provided', () => {
    expect(resolveMcpOperationalDateRange({})).toEqual({});
  });
});
