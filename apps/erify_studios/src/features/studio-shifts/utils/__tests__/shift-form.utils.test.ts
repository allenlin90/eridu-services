import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  combineDateAndTime,
  createEditFormState,
  formatDate,
  getShiftDisplayDate,
  getShiftWindowLabel,
  toLocalTimeInputValue,
} from '@/features/studio-shifts/utils/shift-form.utils';

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue('generated_block');
});

describe('combineDateAndTime', () => {
  it('builds an ISO timestamp from date and time input', () => {
    const iso = combineDateAndTime('2026-03-05', '09:30');
    const parsed = new Date(iso);

    expect(Number.isNaN(parsed.getTime())).toBe(false);
    expect(parsed.getHours()).toBe(9);
    expect(parsed.getMinutes()).toBe(30);
  });
});

describe('toLocalTimeInputValue', () => {
  it('returns local HH:mm string from ISO datetime', () => {
    const iso = '2026-03-05T09:30:00.000Z';
    const time = toLocalTimeInputValue(iso);
    const parsed = new Date(iso);
    const expected = `${String(parsed.getHours()).padStart(2, '0')}:${String(parsed.getMinutes()).padStart(2, '0')}`;

    expect(time).toBe(expected);
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

describe('createEditFormState', () => {
  it('uses sorted blocks and preserves shift metadata', () => {
    const state = createEditFormState({
      id: 'shift-1',
      studio_id: 'studio-1',
      user_id: 'user-1',
      date: '2026-03-05',
      hourly_rate: '10',
      projected_cost: '20',
      calculated_cost: null,
      is_approved: false,
      is_duty_manager: true,
      status: 'COMPLETED',
      metadata: {},
      blocks: [
        { id: 'b2', start_time: '2026-03-05T14:00:00.000Z', end_time: '2026-03-05T16:00:00.000Z', metadata: {}, created_at: '', updated_at: '' },
        { id: 'b1', start_time: '2026-03-05T09:00:00.000Z', end_time: '2026-03-05T10:00:00.000Z', metadata: {}, created_at: '', updated_at: '' },
      ],
      created_at: '',
      updated_at: '',
    });

    expect(state.userId).toBe('user-1');
    expect(state.status).toBe('COMPLETED');
    expect(state.isDutyManager).toBe(true);
    expect(state.blocks[0].startTime).toBe(toLocalTimeInputValue('2026-03-05T09:00:00.000Z'));
    expect(state.blocks[1].startTime).toBe(toLocalTimeInputValue('2026-03-05T14:00:00.000Z'));
  });

  it('falls back to default block when shift has no blocks', () => {
    const state = createEditFormState({
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

    expect(state.blocks).toHaveLength(1);
    expect(state.blocks[0].startTime).toBe('09:00');
    expect(state.blocks[0].endTime).toBe('18:00');
  });
});

describe('getShiftDisplayDate', () => {
  it('prefers first block timestamp date over parent shift date', () => {
    const label = getShiftDisplayDate({
      id: 'shift-1',
      studio_id: 'studio-1',
      user_id: 'user-1',
      date: '2026-03-01',
      hourly_rate: '10',
      projected_cost: '20',
      calculated_cost: null,
      is_approved: false,
      is_duty_manager: false,
      status: 'SCHEDULED',
      metadata: {},
      blocks: [
        { id: 'b1', start_time: '2026-03-05T09:00:00.000Z', end_time: '2026-03-05T10:00:00.000Z', metadata: {}, created_at: '', updated_at: '' },
      ],
      created_at: '',
      updated_at: '',
    });

    expect(label).toContain('2026');
    expect(label).not.toContain('Mar 1');
  });
});

describe('formatDate', () => {
  it('parses date-only values as local calendar date', () => {
    expect(formatDate('2026-03-05')).toBe('Mar 5, 2026');
  });
});
