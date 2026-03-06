import { describe, expect, it } from 'vitest';

import {
  addDays,
  buildOperationalDayWindow,
  DEFAULT_OPERATIONAL_DAY_END_HOUR,
  fromLocalDateInput,
  resolveDateParamOrDefault,
} from '../shift-date.utils';

describe('shiftDateUtils', () => {
  it('adds days without mutating the original date', () => {
    const base = new Date('2026-03-05T10:00:00.000Z');
    const next = addDays(base, 3);

    expect(next.toISOString()).toBe('2026-03-08T10:00:00.000Z');
    expect(base.toISOString()).toBe('2026-03-05T10:00:00.000Z');
  });

  it('builds local start-of-day date from input string', () => {
    const parsed = fromLocalDateInput('2026-03-05');

    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(2);
    expect(parsed.getDate()).toBe(5);
    expect(parsed.getHours()).toBe(0);
    expect(parsed.getMinutes()).toBe(0);
  });

  it('falls back for invalid or empty date params', () => {
    expect(resolveDateParamOrDefault('2026-03-05', '2026-01-01')).toBe('2026-03-05');
    expect(resolveDateParamOrDefault(undefined, '2026-01-01')).toBe('2026-01-01');
    expect(resolveDateParamOrDefault('not-a-date', '2026-01-01')).toBe('2026-01-01');
  });

  it('builds operational day window using default end hour', () => {
    const { dayStart, dayEnd } = buildOperationalDayWindow('2026-03-05');

    expect(dayStart.getFullYear()).toBe(2026);
    expect(dayStart.getMonth()).toBe(2);
    expect(dayStart.getDate()).toBe(5);
    expect(dayStart.getHours()).toBe(0);

    expect(dayEnd.getFullYear()).toBe(2026);
    expect(dayEnd.getMonth()).toBe(2);
    expect(dayEnd.getDate()).toBe(6);
    expect(dayEnd.getHours()).toBe(DEFAULT_OPERATIONAL_DAY_END_HOUR - 1);
    expect(dayEnd.getMinutes()).toBe(59);
    expect(dayEnd.getSeconds()).toBe(59);
    expect(dayEnd.getMilliseconds()).toBe(999);
  });

  it('supports custom operational day end hour', () => {
    const { dayEnd } = buildOperationalDayWindow('2026-03-05', 8);
    expect(dayEnd.getHours()).toBe(7);
  });
});
