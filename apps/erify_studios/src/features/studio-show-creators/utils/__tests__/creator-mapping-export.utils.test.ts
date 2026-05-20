import { describe, expect, it } from 'vitest';

import {
  buildCreatorMappingExportFilename,
  buildCreatorMappingExportRows,
  type CreatorMappingExportResult,
  serializeCreatorMappingExportCsv,
} from '../creator-mapping-export.utils';

import type { StudioShow } from '@/features/studio-shows/api/get-studio-shows';

function createShow(overrides: Partial<StudioShow> = {}): StudioShow {
  return {
    id: 'show_1',
    name: 'Morning Launch',
    client_id: 'client_1',
    client_name: 'Acme',
    schedule_id: 'sch_1',
    schedule_name: 'Main Schedule',
    studio_id: 'std_1',
    studio_name: 'Studio One',
    studio_room_id: 'room_1',
    studio_room_name: 'Room A',
    show_type_id: 'stype_1',
    show_type_name: 'Live',
    show_status_id: 'sstat_1',
    show_status_name: 'Scheduled',
    show_status_system_key: 'SCHEDULED',
    show_standard_id: 'sstd_1',
    show_standard_name: 'Premium',
    start_time: '2026-04-01T09:00:00.000Z',
    end_time: '2026-04-01T10:00:00.000Z',
    actual_start_time: null,
    actual_end_time: null,
    metadata: {},
    created_at: '2026-04-01T00:00:00.000Z',
    updated_at: '2026-04-01T11:00:00.000Z',
    creators: [
      {
        show_creator_id: 'show_mc_1',
        creator_id: 'creator_1',
        creator_name: 'Ari Creator',
        creator_alias_name: 'Ari',
        compensation_type: 'FIXED',
        agreed_rate: '100.00',
        commission_rate: null,
      },
      {
        show_creator_id: 'show_mc_2',
        creator_id: 'creator_2',
        creator_name: 'Bea Creator',
        creator_alias_name: null,
        compensation_type: 'FIXED',
        agreed_rate: '150.00',
        commission_rate: null,
      },
    ],
    platforms: [
      { id: 'platform_1', name: 'YouTube' },
      { id: 'platform_2', name: 'TikTok' },
    ],
    task_summary: {
      total: 3,
      assigned: 2,
      unassigned: 1,
      completed: 1,
    },
    ...overrides,
  };
}

function fixedFormat(value: string): string {
  return `fmt(${value})`;
}

describe('creatorMappingExportUtils', () => {
  it('builds one assignment-focused export row per mapped creator', () => {
    const result = buildCreatorMappingExportRows({
      shows: [
        createShow(),
        createShow({
          id: 'show_2',
          name: 'Empty Slot',
          creators: [],
          platforms: [],
          actual_start_time: '2026-04-01T09:05:00.000Z',
          actual_end_time: '2026-04-01T10:03:00.000Z',
        }),
      ],
      formatDateTime: fixedFormat,
    });

    expect(result.columns.map((column) => column.key)).toEqual([
      'show_name',
      'show_id',
      'client_name',
      'show_status',
      'scheduled_start',
      'scheduled_end',
      'actual_start',
      'actual_end',
      'platforms',
      'room',
      'show_type',
      'show_standard',
      'mapped_state',
      'show_creator_id',
      'creator_id',
      'creator_name',
      'creator_alias',
      'compensation_type',
      'fixed_cost',
    ]);
    expect(result.rows).toEqual([
      {
        show_name: 'Morning Launch',
        show_id: 'show_1',
        client_name: 'Acme',
        show_status: 'Scheduled',
        scheduled_start: 'fmt(2026-04-01T09:00:00.000Z)',
        scheduled_end: 'fmt(2026-04-01T10:00:00.000Z)',
        actual_start: '',
        actual_end: '',
        platforms: 'YouTube; TikTok',
        room: 'Room A',
        show_type: 'Live',
        show_standard: 'Premium',
        mapped_state: 'Mapped',
        show_creator_id: 'show_mc_1',
        creator_id: 'creator_1',
        creator_name: 'Ari Creator',
        creator_alias: 'Ari',
        compensation_type: 'FIXED',
        fixed_cost: '100.00',
      },
      {
        show_name: 'Morning Launch',
        show_id: 'show_1',
        client_name: 'Acme',
        show_status: 'Scheduled',
        scheduled_start: 'fmt(2026-04-01T09:00:00.000Z)',
        scheduled_end: 'fmt(2026-04-01T10:00:00.000Z)',
        actual_start: '',
        actual_end: '',
        platforms: 'YouTube; TikTok',
        room: 'Room A',
        show_type: 'Live',
        show_standard: 'Premium',
        mapped_state: 'Mapped',
        show_creator_id: 'show_mc_2',
        creator_id: 'creator_2',
        creator_name: 'Bea Creator',
        creator_alias: '',
        compensation_type: 'FIXED',
        fixed_cost: '150.00',
      },
      {
        show_name: 'Empty Slot',
        show_id: 'show_2',
        client_name: 'Acme',
        show_status: 'Scheduled',
        scheduled_start: 'fmt(2026-04-01T09:00:00.000Z)',
        scheduled_end: 'fmt(2026-04-01T10:00:00.000Z)',
        actual_start: 'fmt(2026-04-01T09:05:00.000Z)',
        actual_end: 'fmt(2026-04-01T10:03:00.000Z)',
        platforms: '',
        room: 'Room A',
        show_type: 'Live',
        show_standard: 'Premium',
        mapped_state: 'Unmapped',
        show_creator_id: '',
        creator_id: '',
        creator_name: '',
        creator_alias: '',
        compensation_type: '',
        fixed_cost: '',
      },
    ]);
  });

  it('serializes CSV safely and builds stable filenames', () => {
    const result: CreatorMappingExportResult = buildCreatorMappingExportRows({
      shows: [createShow({ name: '=Formula Show' })],
      formatDateTime: fixedFormat,
    });

    const csv = serializeCreatorMappingExportCsv(result);
    expect(csv.charCodeAt(0)).toBe(0xFEFF);
    expect(csv).toContain('"Show Name"');
    expect(csv).toContain('"\'=Formula Show"');

    expect(buildCreatorMappingExportFilename({
      dateFrom: '2026-04-01',
      dateTo: '2026-04-30',
      exportedAt: new Date('2026-05-01T12:34:56.000Z'),
    })).toBe('creator-mapping-2026-04-01_to_2026-04-30-2026-05-01_12-34-56.csv');
  });
});
