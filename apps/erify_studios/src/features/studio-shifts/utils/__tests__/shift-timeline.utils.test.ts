import { describe, expect, it } from 'vitest';

import type { StudioShift } from '@/features/studio-shifts/api/studio-shifts.types';
import { getShiftFirstBlockStartMs, sortShiftsByFirstBlockStart } from '@/features/studio-shifts/utils/shift-timeline.utils';

function createShift(id: string, startTime?: string): StudioShift {
  return {
    id,
    studio_id: 'studio_1',
    user_id: 'user_1',
    date: '2026-03-05',
    hourly_rate: '100',
    projected_cost: '100',
    calculated_cost: null,
    is_approved: false,
    is_duty_manager: false,
    status: 'SCHEDULED',
    metadata: {},
    blocks: startTime
      ? [{
          id: `${id}_block_1`,
          start_time: startTime,
          end_time: new Date(new Date(startTime).getTime() + (60 * 60 * 1000)).toISOString(),
          metadata: {},
          created_at: '',
          updated_at: '',
        }]
      : [],
    created_at: '',
    updated_at: '',
  };
}

describe('getShiftFirstBlockStartMs', () => {
  it('returns null when shift has no blocks', () => {
    expect(getShiftFirstBlockStartMs(createShift('shift_empty'))).toBeNull();
  });

  it('returns earliest block timestamp even when blocks are unsorted', () => {
    const shift = createShift('shift_1', '2026-03-05T14:00:00.000Z');
    shift.blocks = [
      shift.blocks[0],
      {
        id: 'shift_1_block_0',
        start_time: '2026-03-05T09:00:00.000Z',
        end_time: '2026-03-05T10:00:00.000Z',
        metadata: {},
        created_at: '',
        updated_at: '',
      },
    ];

    expect(getShiftFirstBlockStartMs(shift)).toBe(new Date('2026-03-05T09:00:00.000Z').getTime());
  });
});

describe('sortShiftsByFirstBlockStart', () => {
  it('sorts by earliest first block start and puts empty-block shifts last', () => {
    const shifts = sortShiftsByFirstBlockStart([
      createShift('shift_empty'),
      createShift('shift_late', '2026-03-05T14:00:00.000Z'),
      createShift('shift_early', '2026-03-05T09:00:00.000Z'),
    ]);

    expect(shifts.map((shift) => shift.id)).toEqual(['shift_early', 'shift_late', 'shift_empty']);
  });
});
