import { describe, expect, it } from 'vitest';

import {
  buildOperationsReviewRange,
  getOperationsReviewRefetchInterval,
} from '../operations-review-range';

describe('operationsReviewRange', () => {
  it('uses the previous operational day before the 06:00 boundary', () => {
    const range = buildOperationsReviewRange({
      range: 'today',
      now: new Date('2026-05-25T04:30:00'),
    });

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

  it('uses the current operational day at and after the 06:00 boundary', () => {
    const range = buildOperationsReviewRange({
      range: 'today',
      now: new Date('2026-05-25T06:00:00'),
    });

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

  it('polls only the current operational day', () => {
    expect(getOperationsReviewRefetchInterval('today')).toBe(300_000);
    expect(getOperationsReviewRefetchInterval('yesterday')).toBe(false);
    expect(getOperationsReviewRefetchInterval('last_7_days')).toBe(false);
    expect(getOperationsReviewRefetchInterval('custom')).toBe(false);
  });

  it('normalizes custom ranges that end before they start', () => {
    const range = buildOperationsReviewRange({
      range: 'custom',
      dateFrom: '2026-05-25',
      dateTo: '2026-05-24',
      now: new Date('2026-05-25T12:00:00'),
    });

    expect(range.dateFrom).toBe('2026-05-25');
    expect(range.dateTo).toBe('2026-05-25');
  });
});
