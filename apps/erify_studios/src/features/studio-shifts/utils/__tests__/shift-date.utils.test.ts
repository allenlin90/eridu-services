import { describe, expect, it } from 'vitest';

import {
  addDays,
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
});
