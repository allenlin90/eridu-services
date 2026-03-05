import { describe, expect, it } from 'vitest';

import {
  buildStudioShiftsQueryParams,
  sortShiftsByFirstBlockStart,
  validateShiftBlocks,
} from '@/features/studio-shifts/utils/studio-shifts-table.utils';

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

  it('rolls subsequent blocks forward when start is earlier than previous end', () => {
    const result = validateShiftBlocks('2026-03-05', [
      { id: '1', startTime: '23:00', endTime: '01:00' },
      { id: '2', startTime: '00:30', endTime: '02:30' },
    ]);

    expect(result.error).toBeNull();
    expect(result.blocks).not.toBeNull();
    const blocks = result.blocks ?? [];
    expect(new Date(blocks[1].start_time).getTime()).toBeGreaterThanOrEqual(
      new Date(blocks[0].end_time).getTime(),
    );
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

  it('keeps shifts with no blocks at the end', () => {
    const shifts = sortShiftsByFirstBlockStart([
      {
        id: 'empty',
        studio_id: 's',
        user_id: 'u0',
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
      },
      {
        id: 'with-block',
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

    expect(shifts.map((shift) => shift.id)).toEqual(['with-block', 'empty']);
  });
});

describe('buildStudioShiftsQueryParams', () => {
  it('maps duty filter to boolean and omits undefined filters', () => {
    const params = buildStudioShiftsQueryParams({
      page: 2,
      limit: 25,
      duty: 'true',
      user_id: undefined,
      status: undefined,
      date_from: undefined,
      date_to: undefined,
    });

    expect(params).toEqual({
      page: 2,
      limit: 25,
      is_duty_manager: true,
    });
  });

  it('maps duty=false correctly and keeps explicit filters', () => {
    const params = buildStudioShiftsQueryParams({
      page: 1,
      limit: 10,
      user_id: 'user_1',
      status: 'COMPLETED',
      duty: 'false',
      date_from: '2026-03-01',
      date_to: '2026-03-07',
    });

    expect(params).toEqual({
      page: 1,
      limit: 10,
      user_id: 'user_1',
      status: 'COMPLETED',
      is_duty_manager: false,
      date_from: '2026-03-01',
      date_to: '2026-03-07',
    });
  });
});
