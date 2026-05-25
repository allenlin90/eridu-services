import { describe, expect, it } from 'vitest';

import {
  buildOperationalDayRange,
  isCurrentOperationalDay,
  operationalWindowToDayRange,
} from '../operational-day-range';

describe('operationalDayRange', () => {
  it('defaults to the previous operational day before the 06:00 boundary', () => {
    const range = buildOperationalDayRange(
      {},
      new Date('2026-05-25T04:30:00'),
    );

    expect(range.dateFrom).toBe('2026-05-24');
    expect(range.dateTo).toBe('2026-05-24');
    expect(range.windowStart.getFullYear()).toBe(2026);
    expect(range.windowStart.getMonth()).toBe(4);
    expect(range.windowStart.getDate()).toBe(24);
    expect(range.windowStart.getHours()).toBe(6);
    expect(range.windowStart.getMinutes()).toBe(0);
    expect(range.windowEnd.getFullYear()).toBe(2026);
    expect(range.windowEnd.getMonth()).toBe(4);
    expect(range.windowEnd.getDate()).toBe(25);
    expect(range.windowEnd.getHours()).toBe(5);
    expect(range.windowEnd.getMinutes()).toBe(59);
  });

  it('defaults to the current operational day at and after the 06:00 boundary', () => {
    const range = buildOperationalDayRange(
      {},
      new Date('2026-05-25T06:00:00'),
    );

    expect(range.dateFrom).toBe('2026-05-25');
    expect(range.dateTo).toBe('2026-05-25');
    expect(range.windowStart.getFullYear()).toBe(2026);
    expect(range.windowStart.getMonth()).toBe(4);
    expect(range.windowStart.getDate()).toBe(25);
    expect(range.windowStart.getHours()).toBe(6);
    expect(range.windowStart.getMinutes()).toBe(0);
    expect(range.windowEnd.getFullYear()).toBe(2026);
    expect(range.windowEnd.getMonth()).toBe(4);
    expect(range.windowEnd.getDate()).toBe(26);
    expect(range.windowEnd.getHours()).toBe(5);
    expect(range.windowEnd.getMinutes()).toBe(59);
  });

  it('uses explicit URL dates without requiring preset state', () => {
    const range = buildOperationalDayRange(
      {
        date_from: '2026-05-20',
        date_to: '2026-05-25',
      },
      new Date('2026-05-25T12:00:00'),
    );

    expect(range.dateFrom).toBe('2026-05-20');
    expect(range.dateTo).toBe('2026-05-25');
  });

  it('normalizes ranges that end before they start', () => {
    const range = buildOperationalDayRange(
      {
        date_from: '2026-05-25',
        date_to: '2026-05-24',
      },
      new Date('2026-05-25T12:00:00'),
    );

    expect(range.dateFrom).toBe('2026-05-25');
    expect(range.dateTo).toBe('2026-05-25');
  });

  it('detects the current operational day from resolved URL dates', () => {
    const currentRange = buildOperationalDayRange(
      {
        date_from: '2026-05-25',
        date_to: '2026-05-25',
      },
      new Date('2026-05-25T12:00:00'),
    );
    const olderRange = buildOperationalDayRange(
      {
        date_from: '2026-05-24',
        date_to: '2026-05-24',
      },
      new Date('2026-05-25T12:00:00'),
    );

    expect(isCurrentOperationalDay(currentRange, new Date('2026-05-25T12:00:00'))).toBe(true);
    expect(isCurrentOperationalDay(olderRange, new Date('2026-05-25T12:00:00'))).toBe(false);
  });

  it('derives operational dates from persisted window bounds', () => {
    const persisted = buildOperationalDayRange(
      { date_from: '2026-05-20', date_to: '2026-05-25' },
      new Date('2026-05-25T12:00:00'),
    );

    const resolved = operationalWindowToDayRange(
      { from: persisted.windowStart, to: persisted.windowEnd },
      new Date('2026-05-25T12:00:00'),
    );

    expect(resolved.dateFrom).toBe('2026-05-20');
    expect(resolved.dateTo).toBe('2026-05-25');
  });
});
