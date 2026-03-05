import { describe, expect, it } from 'vitest';

import { combineDateAndTime, getShiftWindowLabel } from '@/features/studio-shifts/utils/shift-form.utils';

describe('combineDateAndTime', () => {
  it('builds an ISO timestamp from date and time input', () => {
    const iso = combineDateAndTime('2026-03-05', '09:30');
    const parsed = new Date(iso);

    expect(Number.isNaN(parsed.getTime())).toBe(false);
    expect(parsed.getHours()).toBe(9);
    expect(parsed.getMinutes()).toBe(30);
  });
});

describe('getShiftWindowLabel', () => {
  it('returns "No shift blocks" when blocks are empty', () => {
    const label = getShiftWindowLabel({
      id: 'shift-1',
      studio_id: 'studio-1',
      user_id: 'user-1',
      date: '2026-03-05',
      hourly_rate: '10',
      projected_cost: '20',
      calculated_cost: null,
      is_approved: false,
      is_duty_manager: false,
      status: 'SCHEDULED',
      metadata: {},
      blocks: [],
      created_at: '',
      updated_at: '',
    });

    expect(label).toBe('No shift blocks');
  });
});
