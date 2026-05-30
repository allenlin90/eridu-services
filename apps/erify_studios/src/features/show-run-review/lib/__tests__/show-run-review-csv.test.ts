import { describe, expect, it, vi } from 'vitest';

import {
  CREATOR_CSV_COLUMNS,
  exportShowRunReviewCreators,
  exportShowRunReviewShows,
  exportShowRunReviewViolations,
  SHOW_CSV_COLUMNS,
  toCreatorCsvRow,
  toShowCsvRow,
  toViolationCsvRow,
  VIOLATION_CSV_COLUMNS,
} from '../show-run-review-csv';

import type {
  ShowRunReviewCreatorException,
  ShowRunReviewShow,
  ShowRunReviewViolation,
} from '@/features/shows/api/get-show-run-review-paginated';

const sample: ShowRunReviewCreatorException = {
  show_creator_uid: 'shc_1',
  creator_name: 'Alice',
  show_name: 'Morning Show',
  show_start_time: '2026-05-20T01:00:00.000Z',
  status: 'LATE',
  late_minutes: 12,
  reason: 'traffic',
};

describe('toCreatorCsvRow', () => {
  it('flattens a typed row to string cells for every column', () => {
    const row = toCreatorCsvRow(sample);
    for (const col of CREATOR_CSV_COLUMNS) {
      expect(typeof row[col.key]).toBe('string');
    }
    expect(row.creator_name).toBe('Alice');
    expect(row.late_minutes).toBe('12');
    expect(row.reason).toBe('traffic');
  });

  it('renders null reason as empty string', () => {
    expect(toCreatorCsvRow({ ...sample, reason: null }).reason).toBe('');
  });
});

describe('exportShowRunReviewCreators', () => {
  it('serializes ALL provided rows (not a page) and triggers a download', () => {
    const download = vi.fn();
    const rows = Array.from({ length: 200 }, (_, i) => ({ ...sample, show_creator_uid: `shc_${i}` }));

    exportShowRunReviewCreators(rows, { dateFrom: '2026-05-20', dateTo: '2026-05-20', download });

    expect(download).toHaveBeenCalledTimes(1);
    const arg = download.mock.calls[0][0];
    // header + 200 data rows
    expect(arg.content.split('\r\n')).toHaveLength(201);
    expect(arg.filename).toBe('show-run-creators-2026-05-20_2026-05-20.csv');
    expect(arg.mimeType).toContain('text/csv');
  });
});

describe('other tab mappers stay total against their column lists', () => {
  it('violations: every column key resolves to a string cell', () => {
    const violation: ShowRunReviewViolation = {
      violation_uid: 'vio_1',
      platform_name: 'TikTok',
      show_name: 'Morning Show',
      show_start_time: '2026-05-20T01:00:00.000Z',
      violation_type: 'OFFLINE',
      severity: 'HIGH',
      reason: 'stream dropped',
      observed_at: '2026-05-20T02:00:00.000Z',
    };
    const row = toViolationCsvRow(violation);
    for (const col of VIOLATION_CSV_COLUMNS) {
      expect(typeof row[col.key]).toBe('string');
    }
  });

  it('shows: every column key resolves to a string cell', () => {
    const show: ShowRunReviewShow = {
      id: 'sho_1',
      shows_range: 'Morning Show',
      actuals_completeness: 'COMPLETE',
      status: 'ALL STARTED',
    };
    const row = toShowCsvRow(show);
    for (const col of SHOW_CSV_COLUMNS) {
      expect(typeof row[col.key]).toBe('string');
    }
  });

  it('shows export triggers a download with the shows filename', () => {
    const download = vi.fn();
    exportShowRunReviewShows([], { dateFrom: '2026-05-01', dateTo: '2026-05-31', download });
    expect(download.mock.calls[0][0].filename).toBe('show-run-shows-2026-05-01_2026-05-31.csv');
  });

  it('violations export triggers a download with the violations filename', () => {
    const download = vi.fn();
    exportShowRunReviewViolations([], { dateFrom: '2026-05-01', dateTo: '2026-05-31', download });
    expect(download.mock.calls[0][0].filename).toBe('show-run-violations-2026-05-01_2026-05-31.csv');
  });
});
