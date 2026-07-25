import { describe, expect, it } from 'vitest';

import { formatShowDate, formatShowTime, formatShowTimeRange } from '../show-time-format';

// Fixed local-time instants so assertions are stable regardless of parsing path.
const START = new Date(2026, 6, 24, 9, 0); // Jul 24 2026, 9:00 AM
const END = new Date(2026, 6, 24, 10, 30); // Jul 24 2026, 10:30 AM

describe('formatShowDate', () => {
  it('formats a date as "MMM d, yyyy"', () => {
    expect(formatShowDate(START)).toBe('Jul 24, 2026');
  });
});

describe('formatShowTime', () => {
  it('formats a time as "h:mm a"', () => {
    expect(formatShowTime(START)).toBe('9:00 AM');
  });
});

describe('formatShowTimeRange', () => {
  it('renders "start - end" when an end time is present', () => {
    expect(formatShowTimeRange(START, END)).toBe('9:00 AM - 10:30 AM');
  });

  it('renders only the start when the end time is missing', () => {
    expect(formatShowTimeRange(START)).toBe('9:00 AM');
    expect(formatShowTimeRange(START, null)).toBe('9:00 AM');
    expect(formatShowTimeRange(START, '')).toBe('9:00 AM');
  });
});
