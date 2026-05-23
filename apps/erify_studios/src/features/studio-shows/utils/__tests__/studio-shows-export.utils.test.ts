import { describe, expect, it } from 'vitest';

import type { StudioShow } from '../../api/get-studio-shows';
import {
  buildStudioShowExportFilename,
  buildStudioShowExportRows,
  createStudioShowExportContent,
  serializeStudioShowExportCsv,
  type StudioShowExportResult,
  type StudioShowExportRow,
} from '../studio-shows-export.utils';

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
        creator_id: 'creator_1',
        creator_name: 'Ari Creator',
        creator_alias_name: 'Ari',
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
    has_proper_task_assignment: true,
    ...overrides,
  };
}

function fixedFormat(value: string): string {
  return `fmt(${value})`;
}

describe('studioShowsExportUtils', () => {
  it('builds export rows with show actuals status and task summary columns', () => {
    const { rows, columns } = buildStudioShowExportRows({
      shows: [createShow()],
      formatDateTime: fixedFormat,
    });

    expect(columns.map((c) => c.key)).toEqual([
      'id',
      'name',
      'client_name',
      'schedule_name',
      'show_status',
      'show_type',
      'show_standard',
      'platforms',
      'creators',
      'planned_start',
      'planned_end',
      'actual_start',
      'actual_end',
      'actuals_status',
      'task_total',
      'task_assigned',
      'task_unassigned',
      'task_completed',
      'updated_at',
    ]);
    expect(rows).toEqual([
      {
        id: 'show_1',
        name: 'Morning Launch',
        client_name: 'Acme',
        schedule_name: 'Main Schedule',
        show_status: 'Scheduled',
        show_type: 'Live',
        show_standard: 'Premium',
        platforms: 'YouTube; TikTok',
        creators: 'Ari Creator (Ari)',
        planned_start: 'fmt(2026-04-01T09:00:00.000Z)',
        planned_end: 'fmt(2026-04-01T10:00:00.000Z)',
        actual_start: '',
        actual_end: '',
        actuals_status: 'Missing',
        task_total: '3',
        task_assigned: '2',
        task_unassigned: '1',
        task_completed: '1',
        updated_at: 'fmt(2026-04-01T11:00:00.000Z)',
      },
    ]);
  });

  it('formats multiple platforms and treats no platforms as empty', () => {
    const { rows } = buildStudioShowExportRows({
      shows: [
        createShow({ id: 'show_with_platforms' }),
        createShow({ id: 'show_no_platforms', platforms: [] }),
      ],
      formatDateTime: fixedFormat,
    });

    expect(rows[0].platforms).toBe('YouTube; TikTok');
    expect(rows[1].platforms).toBe('');
  });

  it('marks complete and incomplete actuals distinctly', () => {
    const { rows } = buildStudioShowExportRows({
      shows: [
        createShow({
          id: 'show_complete',
          actual_start_time: '2026-04-01T09:05:00.000Z',
          actual_end_time: '2026-04-01T10:03:00.000Z',
        }),
        createShow({
          id: 'show_incomplete',
          actual_start_time: '2026-04-01T09:05:00.000Z',
          actual_end_time: null,
        }),
      ],
      formatDateTime: fixedFormat,
    });

    expect(rows[0].actuals_status).toBe('Complete');
    expect(rows[0].actual_start).toBe('fmt(2026-04-01T09:05:00.000Z)');
    expect(rows[0].actual_end).toBe('fmt(2026-04-01T10:03:00.000Z)');
    expect(rows[1].actuals_status).toBe('Incomplete');
    expect(rows[1].actual_start).toBe('fmt(2026-04-01T09:05:00.000Z)');
    expect(rows[1].actual_end).toBe('');
  });

  it('serializes CSV and JSON content and builds stable filenames', () => {
    const result: StudioShowExportResult = buildStudioShowExportRows({
      shows: [createShow({ name: '=Formula Show' })],
      formatDateTime: fixedFormat,
    });

    const csv = serializeStudioShowExportCsv(result);
    expect(csv.charCodeAt(0)).toBe(0xFEFF);
    expect(csv).toContain('"Show Name"');
    expect(csv).toContain('"\'=Formula Show"');

    const json = createStudioShowExportContent(result, 'json');
    expect(JSON.parse(json) as StudioShowExportRow[]).toEqual(result.rows);

    expect(buildStudioShowExportFilename({
      format: 'csv',
      dateFrom: '2026-04-01',
      dateTo: '2026-04-30',
      exportedAt: new Date('2026-05-01T12:34:56.000Z'),
    })).toBe('studio-shows-2026-04-01_to_2026-04-30-2026-05-01_12-34-56.csv');
  });
});
