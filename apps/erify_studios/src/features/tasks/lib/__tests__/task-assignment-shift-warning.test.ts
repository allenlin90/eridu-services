import { describe, expect, it } from 'vitest';

import {
  buildShiftCoverageWarning,
  hasShiftCoverageForWindow,
} from '../task-assignment-shift-warning';

import type { StudioShift } from '@/features/studio-shifts/api/studio-shifts.types';

function createShift(
  id: string,
  startTime: string,
  endTime: string,
  status: StudioShift['status'] = 'SCHEDULED',
): StudioShift {
  return {
    id,
    studio_id: 'std_1',
    user_id: 'usr_1',
    date: '2026-03-05',
    hourly_rate: '20.00',
    projected_cost: '40.00',
    calculated_cost: null,
    is_approved: false,
    is_duty_manager: false,
    status,
    metadata: {},
    blocks: [
      {
        id: `${id}_block`,
        start_time: startTime,
        end_time: endTime,
        metadata: {},
        created_at: startTime,
        updated_at: startTime,
      },
    ],
    created_at: startTime,
    updated_at: startTime,
  };
}

describe('taskAssignmentShiftWarning', () => {
  it('detects overlap from non-cancelled shifts', () => {
    const shifts = [
      createShift('ssh_1', '2026-03-05T09:00:00.000Z', '2026-03-05T11:00:00.000Z'),
    ];

    expect(
      hasShiftCoverageForWindow(
        shifts,
        new Date('2026-03-05T10:00:00.000Z'),
        new Date('2026-03-05T12:00:00.000Z'),
      ),
    ).toBe(true);
  });

  it('ignores cancelled shifts when checking overlap', () => {
    const shifts = [
      createShift('ssh_cancelled', '2026-03-05T09:00:00.000Z', '2026-03-05T11:00:00.000Z', 'CANCELLED'),
    ];

    expect(
      hasShiftCoverageForWindow(
        shifts,
        new Date('2026-03-05T10:00:00.000Z'),
        new Date('2026-03-05T12:00:00.000Z'),
      ),
    ).toBe(false);
  });

  it('builds warning message with show context', () => {
    const message = buildShiftCoverageWarning('Premium Show', new Date('2026-03-05T10:00:00.000Z'));
    expect(message).toContain('Premium Show');
    expect(message).toContain('2026-03-05');
  });
});
