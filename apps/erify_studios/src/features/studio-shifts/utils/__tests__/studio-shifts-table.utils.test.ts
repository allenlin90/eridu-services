import { describe, expect, it } from 'vitest';

import { sortShiftsByFirstBlockStart, validateShiftBlocks } from '@/features/studio-shifts/utils/studio-shifts-table.utils';

describe('validateShiftBlocks', () => {
  it('returns an error when no blocks are provided', () => {
    const result = validateShiftBlocks('2026-03-05', []);
    expect(result.error).toBe('At least one shift block is required.');
    expect(result.blocks).toBeNull();
  });

  it('sorts blocks by start time before building payload', () => {
    const result = validateShiftBlocks('2026-03-05', [
      { id: '2', startTime: '14:00', endTime: '16:00' },
      { id: '1', startTime: '09:00', endTime: '11:00' },
    ]);

    expect(result.error).toBeNull();
    expect(result.blocks).not.toBeNull();
    const blocks = result.blocks ?? [];
    expect(new Date(blocks[0].start_time).getTime()).toBeLessThan(new Date(blocks[1].start_time).getTime());
  });

  it('normalizes cross-midnight block windows', () => {
    const result = validateShiftBlocks('2026-03-05', [
      { id: '1', startTime: '23:00', endTime: '01:00' },
    ]);

    expect(result.error).toBeNull();
    expect(result.blocks).not.toBeNull();
    const block = result.blocks?.[0];
    expect(block).toBeDefined();
    expect(new Date(block!.end_time).getTime()).toBeGreaterThan(new Date(block!.start_time).getTime());
  });

  it('returns an error when any block has missing time fields', () => {
    const result = validateShiftBlocks('2026-03-05', [
      { id: '1', startTime: '', endTime: '10:00' },
    ]);

    expect(result.error).toBe('Start time and end time are required for all blocks.');
    expect(result.blocks).toBeNull();
  });
});

describe('sortShiftsByFirstBlockStart', () => {
  it('sorts shifts by earliest block start time', () => {
    const shifts = sortShiftsByFirstBlockStart([
      {
        id: '2',
        studio_id: 's',
        user_id: 'u2',
        date: '2026-03-05',
        hourly_rate: '10',
        projected_cost: '20',
        calculated_cost: null,
        is_approved: false,
        is_duty_manager: false,
        status: 'SCHEDULED',
        metadata: {},
        blocks: [{ id: 'b2', start_time: '2026-03-05T14:00:00.000Z', end_time: '2026-03-05T16:00:00.000Z', metadata: {}, created_at: '', updated_at: '' }],
        created_at: '',
        updated_at: '',
      },
      {
        id: '1',
        studio_id: 's',
        user_id: 'u1',
        date: '2026-03-05',
        hourly_rate: '10',
        projected_cost: '20',
        calculated_cost: null,
        is_approved: false,
        is_duty_manager: false,
        status: 'SCHEDULED',
        metadata: {},
        blocks: [{ id: 'b1', start_time: '2026-03-05T09:00:00.000Z', end_time: '2026-03-05T10:00:00.000Z', metadata: {}, created_at: '', updated_at: '' }],
        created_at: '',
        updated_at: '',
      },
    ]);

    expect(shifts.map((shift) => shift.id)).toEqual(['1', '2']);
  });
});
