import 'temporal-polyfill/global';

import { describe, expect, it } from 'vitest';

import { toScheduleXDateTime } from '@/features/studio-shifts/utils/schedule-x.utils';

describe('toScheduleXDateTime', () => {
  it('preserves instant for ISO strings with timezone offsets', () => {
    const value = '2026-03-05T10:00:00.000Z';
    const zdt = toScheduleXDateTime(value);

    expect(zdt.epochMilliseconds).toBe(globalThis.Temporal.Instant.from(value).epochMilliseconds);
  });

  it('treats floating ISO strings as local runtime wall time', () => {
    const zdt = toScheduleXDateTime('2026-03-05T10:15:00');

    expect(zdt.year).toBe(2026);
    expect(zdt.month).toBe(3);
    expect(zdt.day).toBe(5);
    expect(zdt.hour).toBe(10);
    expect(zdt.minute).toBe(15);
  });

  it('supports Date inputs without changing epoch', () => {
    const date = new Date('2026-03-05T10:00:00.000Z');
    const zdt = toScheduleXDateTime(date);

    expect(zdt.epochMilliseconds).toBe(date.getTime());
  });
});
