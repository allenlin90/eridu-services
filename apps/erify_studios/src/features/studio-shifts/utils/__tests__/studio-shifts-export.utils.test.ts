import { describe, expect, it } from 'vitest';

import type { StudioShift } from '../../api/studio-shifts.types';
import {
  buildStudioShiftExportFilename,
  buildStudioShiftExportRows,
  createStudioShiftExportContent,
  serializeStudioShiftExportCsv,
} from '../studio-shifts-export.utils';

function createShift(overrides: Partial<StudioShift> = {}): StudioShift {
  return {
    id: 'ssh_1',
    studio_id: 'std_1',
    user_id: 'user_1',
    user_name: 'Ava Manager',
    date: '2026-03-05',
    hourly_rate: '20.00',
    projected_cost: '60.00',
    calculated_cost: null,
    is_approved: false,
    is_duty_manager: true,
    status: 'SCHEDULED',
    metadata: {},
    blocks: [
      {
        id: 'ssb_1',
        start_time: '2026-03-05T09:00:00.000Z',
        end_time: '2026-03-05T12:30:00.000Z',
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

describe('studioShiftsExportUtils', () => {
  it('builds export rows from the current shift view', () => {
    const rows = buildStudioShiftExportRows({
      shifts: [createShift()],
      memberMap: new Map([['user_1', { name: 'Ava Manager', email: 'ava@example.com' }]]),
      getShiftDisplayDate: () => 'Mar 5, 2026',
      getShiftBlockLabels: () => ['09:00-12:30'],
      getShiftWindowLabel: () => '09:00-12:30',
      formatDateTime: () => 'Mar 5, 2026, 13:00',
    });

    expect(rows).toEqual([
      {
        id: 'ssh_1',
        member_name: 'Ava Manager',
        member_email: 'ava@example.com',
        date: 'Mar 5, 2026',
        window: '09:00-12:30',
        blocks: '09:00-12:30',
        total_hours: '3.50',
        projected_cost: '60.00',
        calculated_cost: '',
        status: 'SCHEDULED',
        duty_manager: 'Yes',
        updated_at: 'Mar 5, 2026, 13:00',
      },
    ]);
  });

  it('serializes CSV with escaped cells', () => {
    const csv = serializeStudioShiftExportCsv([
      {
        id: 'ssh_1',
        member_name: 'Ava "Lead"',
        member_email: 'ava@example.com',
        date: 'Mar 5, 2026',
        window: '09:00-12:30',
        blocks: '09:00-12:30; 13:00-14:00',
        total_hours: '4.50',
        projected_cost: '60.00',
        calculated_cost: '',
        status: 'SCHEDULED',
        duty_manager: 'Yes',
        updated_at: 'Mar 5, 2026, 13:00',
      },
    ]);

    expect(csv).toContain('"Member"');
    expect(csv).toContain('"Ava ""Lead"""');
  });

  it('creates JSON content and stable filenames', () => {
    const rows = [{
      id: 'ssh_1',
      member_name: 'Ava Manager',
      member_email: 'ava@example.com',
      date: 'Mar 5, 2026',
      window: '09:00-12:30',
      blocks: '09:00-12:30',
      total_hours: '3.50',
      projected_cost: '60.00',
      calculated_cost: '',
      status: 'SCHEDULED',
      duty_manager: 'Yes',
      updated_at: 'Mar 5, 2026, 13:00',
    }];

    expect(JSON.parse(createStudioShiftExportContent(rows, 'json'))).toEqual(rows);
    expect(buildStudioShiftExportFilename({
      format: 'csv',
      dateFrom: '2026-03-01',
      dateTo: '2026-03-07',
      exportedAt: new Date('2026-03-08T12:00:00.000Z'),
    })).toBe('studio-shifts-2026-03-01_to_2026-03-07-2026-03-08.csv');
  });
});
