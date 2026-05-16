import { describe, expect, it } from 'vitest';

import {
  createDefaultShiftCalendarRange,
  createDefaultShiftPlanningRange,
  createShiftCalendarJumpRange,
  createShiftPlanningRangeFromStart,
  extractDateStringFromUnknown,
  getShiftCalendarRangeLimit,
  getShiftCalendarViewBucket,
} from '../shift-calendar-range.utils';

describe('shiftCalendarRangeUtils', () => {
  it('extracts date from unknown values', () => {
    expect(extractDateStringFromUnknown('2026-03-10T12:30:00Z')).toBe('2026-03-10');
    expect(extractDateStringFromUnknown('invalid-value')).toBeNull();
  });

  it('creates default range with configured buffers', () => {
    const range = createDefaultShiftCalendarRange(new Date('2026-03-10T08:00:00.000Z'));
    expect(range).toEqual({
      date_from: '2026-03-09',
      date_to: '2026-03-15',
    });
  });

  it('creates the default shift planning range for current-view cost planning', () => {
    const range = createDefaultShiftPlanningRange(new Date('2026-03-10T08:00:00.000Z'));
    expect(range).toEqual({
      date_from: '2026-03-10',
      date_to: '2026-03-16',
    });
  });

  it('creates a shift planning range from an explicit start date', () => {
    expect(createShiftPlanningRangeFromStart('2026-03-12')).toEqual({
      date_from: '2026-03-12',
      date_to: '2026-03-18',
    });
  });

  it('creates jump range around target date', () => {
    const range = createShiftCalendarJumpRange('2026-03-20');
    expect(range).toEqual({
      date_from: '2026-03-19',
      date_to: '2026-03-28',
    });
  });

  it('derives view bucket from visible range span', () => {
    expect(getShiftCalendarViewBucket(null)).toBe('week');
    expect(getShiftCalendarViewBucket({ date_from: '2026-03-10', date_to: '2026-03-10' })).toBe('day');
    expect(getShiftCalendarViewBucket({ date_from: '2026-03-10', date_to: '2026-03-16' })).toBe('week');
    expect(getShiftCalendarViewBucket({ date_from: '2026-03-01', date_to: '2026-03-31' })).toBe('month');
  });

  it('calculates bounded query limit using view-aware profiles', () => {
    expect(getShiftCalendarRangeLimit(null)).toBe(90);
    expect(getShiftCalendarRangeLimit({ date_from: '2026-03-10', date_to: '2026-03-10' }, 'day')).toBe(24);
    expect(getShiftCalendarRangeLimit({ date_from: '2026-03-10', date_to: '2026-03-16' }, 'week')).toBe(70);
    expect(getShiftCalendarRangeLimit({ date_from: '2026-01-01', date_to: '2026-06-30' }, 'month')).toBe(600);
  });
});
