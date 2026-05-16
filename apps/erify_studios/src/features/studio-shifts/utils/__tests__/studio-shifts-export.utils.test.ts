import { describe, expect, it } from 'vitest';

import type { StudioShift } from '../../api/studio-shifts.types';
import {
  buildStudioShiftExportFilename,
  buildStudioShiftExportRows,
  createStudioShiftExportContent,
  serializeStudioShiftExportCsv,
  type StudioShiftExportResult,
  type StudioShiftExportRow,
} from '../studio-shifts-export.utils';

function createShift(overrides: Partial<StudioShift> = {}): StudioShift {
  return {
    id: 'ssh_1',
    studio_id: 'std_1',
    user_id: 'user_1',
    user_name: 'Ava Manager',
    date: '2026-03-05',
    hourly_rate: '20.00',
    planned_cost: '60.00',
    actual_cost: null,
    is_approved: false,
    is_duty_manager: true,
    status: 'SCHEDULED',
    metadata: {},
    blocks: [
      {
        id: 'ssb_1',
        start_time: '2026-03-05T09:00:00.000Z',
        end_time: '2026-03-05T12:30:00.000Z',
        actual_start_time: null,
        actual_end_time: null,
        metadata: {},
        created_at: '2026-03-05T00:00:00.000Z',
        updated_at: '2026-03-05T00:00:00.000Z',
      },
    ],
    created_at: '2026-03-05T00:00:00.000Z',
    updated_at: '2026-03-05T13:00:00.000Z',
    ...overrides,
  };
}

function fixedFormat(value: string): string {
  // Test-only formatter: tag the original ISO so block columns are easy to assert.
  return `fmt(${value})`;
}

describe('studioShiftsExportUtils', () => {
  it('builds export rows with per-block planned + actual columns and leaves pending actuals empty', () => {
    const { rows, columns } = buildStudioShiftExportRows({
      shifts: [createShift()],
      memberMap: new Map([['user_1', { name: 'Ava Manager', email: 'ava@example.com' }]]),
      getShiftDisplayDate: () => 'Mar 5, 2026',
      getShiftWindowLabel: () => '09:00-12:30',
      formatDateTime: fixedFormat,
    });

    expect(columns.map((c) => c.key)).toEqual([
      'id',
      'member_name',
      'member_email',
      'date',
      'window',
      'total_hours',
      'planned_cost',
      'actual_cost',
      'status',
      'duty_manager',
      'updated_at',
      'block_1_planned_start',
      'block_1_planned_end',
      'block_1_actual_start',
      'block_1_actual_end',
    ]);
    expect(rows).toEqual([
      {
        id: 'ssh_1',
        member_name: 'Ava Manager',
        member_email: 'ava@example.com',
        date: 'Mar 5, 2026',
        window: '09:00-12:30',
        total_hours: '3.50',
        planned_cost: '60.00',
        actual_cost: '',
        status: 'SCHEDULED',
        duty_manager: 'Yes',
        updated_at: 'fmt(2026-03-05T13:00:00.000Z)',
        block_1_planned_start: 'fmt(2026-03-05T09:00:00.000Z)',
        block_1_planned_end: 'fmt(2026-03-05T12:30:00.000Z)',
        block_1_actual_start: '',
        block_1_actual_end: '',
      },
    ]);
  });

  it('emits actual_start/end cells when actuals are recorded', () => {
    const shift = createShift({
      actual_cost: '70.00',
      blocks: [
        {
          id: 'ssb_1',
          start_time: '2026-03-05T09:00:00.000Z',
          end_time: '2026-03-05T13:00:00.000Z',
          actual_start_time: '2026-03-05T09:05:00.000Z',
          actual_end_time: '2026-03-05T12:35:00.000Z',
          metadata: {},
          created_at: '2026-03-05T00:00:00.000Z',
          updated_at: '2026-03-05T00:00:00.000Z',
        },
      ],
    });
    const { rows } = buildStudioShiftExportRows({
      shifts: [shift],
      memberMap: new Map(),
      getShiftDisplayDate: () => 'Mar 5, 2026',
      getShiftWindowLabel: () => '09:00-13:00',
      formatDateTime: fixedFormat,
    });

    expect(rows[0].actual_cost).toBe('70.00');
    expect(rows[0].block_1_actual_start).toBe('fmt(2026-03-05T09:05:00.000Z)');
    expect(rows[0].block_1_actual_end).toBe('fmt(2026-03-05T12:35:00.000Z)');
  });

  it('grows the column set to the max blocks across shifts and pads shorter rows with empty cells', () => {
    const singleBlockShift = createShift({ id: 'ssh_1' });
    const twoBlockShift = createShift({
      id: 'ssh_2',
      blocks: [
        {
          id: 'ssb_a',
          start_time: '2026-03-05T09:00:00.000Z',
          end_time: '2026-03-05T12:30:00.000Z',
          actual_start_time: '2026-03-05T09:00:00.000Z',
          actual_end_time: '2026-03-05T12:30:00.000Z',
          metadata: {},
          created_at: '2026-03-05T00:00:00.000Z',
          updated_at: '2026-03-05T00:00:00.000Z',
        },
        {
          id: 'ssb_b',
          start_time: '2026-03-05T13:00:00.000Z',
          end_time: '2026-03-05T14:00:00.000Z',
          actual_start_time: '2026-03-05T13:00:00.000Z',
          actual_end_time: '2026-03-05T14:00:00.000Z',
          metadata: {},
          created_at: '2026-03-05T00:00:00.000Z',
          updated_at: '2026-03-05T00:00:00.000Z',
        },
      ],
    });

    const { rows, columns } = buildStudioShiftExportRows({
      shifts: [singleBlockShift, twoBlockShift],
      memberMap: new Map(),
      getShiftDisplayDate: () => 'Mar 5, 2026',
      getShiftWindowLabel: () => '',
      formatDateTime: fixedFormat,
    });

    // Two blocks max → four per-block columns × 2 = 8 dynamic columns.
    expect(columns.filter((c) => c.key.startsWith('block_'))).toHaveLength(8);
    expect(columns.map((c) => c.key)).toContain('block_2_actual_end');

    // Single-block shift has empty cells for block 2.
    expect(rows[0].block_2_planned_start).toBe('');
    expect(rows[0].block_2_planned_end).toBe('');
    expect(rows[0].block_2_actual_start).toBe('');
    expect(rows[0].block_2_actual_end).toBe('');

    // Two-block shift has both blocks filled, sorted by start_time ascending.
    expect(rows[1].block_1_planned_start).toBe('fmt(2026-03-05T09:00:00.000Z)');
    expect(rows[1].block_2_planned_start).toBe('fmt(2026-03-05T13:00:00.000Z)');
  });

  it('serializes CSV with escaped cells, a UTF-8 BOM, CRLF line endings, and per-block header labels', () => {
    const result: StudioShiftExportResult = buildStudioShiftExportRows({
      shifts: [createShift({ user_name: 'Ava "Lead"' })],
      memberMap: new Map(),
      getShiftDisplayDate: () => 'Mar 5, 2026',
      getShiftWindowLabel: () => '09:00-12:30',
      formatDateTime: fixedFormat,
    });

    const csv = serializeStudioShiftExportCsv(result);

    expect(csv.charCodeAt(0)).toBe(0xFEFF);
    expect(csv).toContain('\r\n');
    expect(csv).not.toMatch(/[^\r]\n/);
    expect(csv).toContain('"Member"');
    expect(csv).toContain('"Ava ""Lead"""');
    expect(csv).toContain('"Block 1 Planned Start"');
    expect(csv).toContain('"Block 1 Actual End"');
  });

  it('creates JSON content and stable filenames', () => {
    const result = buildStudioShiftExportRows({
      shifts: [createShift()],
      memberMap: new Map(),
      getShiftDisplayDate: () => 'Mar 5, 2026',
      getShiftWindowLabel: () => '09:00-12:30',
      formatDateTime: fixedFormat,
    });

    const json = createStudioShiftExportContent(result, 'json');
    expect(JSON.parse(json) as StudioShiftExportRow[]).toEqual(result.rows);

    expect(buildStudioShiftExportFilename({
      format: 'csv',
      dateFrom: '2026-03-01',
      dateTo: '2026-03-07',
      exportedAt: new Date('2026-03-08T12:34:56.000Z'),
    })).toBe('studio-shifts-2026-03-01_to_2026-03-07-2026-03-08_12-34-56.csv');
  });
});
