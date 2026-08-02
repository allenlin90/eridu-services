import { describe, expect, it, vi } from 'vitest';

import {
  CREATOR_CSV_COLUMNS,
  exportShowRunReviewCreators,
  exportShowRunReviewIssues,
  exportShowRunReviewShows,
  exportShowRunReviewViolations,
  ISSUE_CSV_COLUMNS,
  SHOW_CSV_COLUMNS,
  toCreatorCsvRow,
  toIssueCsvRow,
  toShowCsvRow,
  toViolationCsvRow,
  VIOLATION_CSV_COLUMNS,
} from '../show-run-review-csv';

import type {
  ShowRunReviewCreatorException,
  ShowRunReviewIssue,
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

  it('reduces ISO-instant range bounds to a filesystem-safe date-only filename', () => {
    const download = vi.fn();

    exportShowRunReviewCreators([], {
      dateFrom: '2026-05-20T06:00:00.000Z',
      dateTo: '2026-05-21T05:59:59.999Z',
      download,
    });

    expect(download.mock.calls[0][0].filename).toBe('show-run-creators-2026-05-20_2026-05-21.csv');
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

describe('toIssueCsvRow', () => {
  const issue: ShowRunReviewIssue = {
    id: 'issue_1',
    show_id: 'show_1',
    show_name: 'Morning Show',
    category: 'EQUIPMENT',
    origin: 'MANUAL',
    severity: 'HIGH',
    status: 'OPEN',
    title: 'Broken mic',
    evidence: null,
    owner: null,
    due_at: '2026-05-20T12:00:00.000Z',
    created_by: null,
    escalation_level: 0,
    escalated_at: null,
    escalated_by: null,
    escalation_note: null,
    resolved_at: null,
    resolved_by: null,
    resolution_code: null,
    resolution_note: null,
    show_creator_id: null,
    show_platform_violation_id: null,
    version: 1,
    created_at: '2026-05-20T00:00:00.000Z',
    updated_at: '2026-05-20T00:00:00.000Z',
  };

  it('every column key resolves to a string cell', () => {
    const row = toIssueCsvRow(issue);
    for (const col of ISSUE_CSV_COLUMNS) {
      expect(typeof row[col.key]).toBe('string');
    }
  });

  // Regression: the Show column previously exported the raw show_id UID
  // instead of the readable show_name, the one inconsistent spot against
  // every sibling tab (creators/violations/tasks) and this same tab's own
  // on-screen table.
  it('exports show_name (not the raw show_id UID) for the Show column', () => {
    const row = toIssueCsvRow(issue);
    expect(row.show_name).toBe('Morning Show');
    expect(row.show_id).toBeUndefined();
  });

  it('renders a null due_at as an empty string', () => {
    expect(toIssueCsvRow({ ...issue, due_at: null }).due_at).toBe('');
  });

  it('export triggers a download with the issues filename', () => {
    const download = vi.fn();
    exportShowRunReviewIssues([], { dateFrom: '2026-05-01', dateTo: '2026-05-31', download });
    expect(download.mock.calls[0][0].filename).toBe('show-run-issues-2026-05-01_2026-05-31.csv');
  });
});
