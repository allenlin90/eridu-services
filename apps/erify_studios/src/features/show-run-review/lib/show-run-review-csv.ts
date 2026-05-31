import type {
  ShowRunReviewCreatorException,
  ShowRunReviewShow,
  ShowRunReviewTask,
  ShowRunReviewViolation,
} from '@/features/shows/api/get-show-run-review-paginated';
import { type CsvColumn, serializeRowsToCsv } from '@/lib/csv';
import { triggerBrowserDownload } from '@/lib/file-download';

type CsvRow = Record<string, string>;
const s = (v: string | number | null | undefined): string => (v === null || v === undefined ? '' : String(v));

export type ShowRunReviewExportTab = 'creators' | 'violations' | 'tasks' | 'shows';

type ExportOptions = {
  dateFrom: string;
  dateTo: string;
  // Injectable for tests; defaults to the real browser download.
  download?: (params: { content: string; mimeType: string; filename: string }) => void;
};

const CSV_MIME = 'text/csv;charset=utf-8;';

function fileName(tab: ShowRunReviewExportTab, dateFrom: string, dateTo: string): string {
  // Use the date-only portion: range bounds are ISO instants whose colons are
  // illegal in Windows filenames and get mangled by browser download sanitizers.
  return `show-run-${tab}-${dateFrom.slice(0, 10)}_${dateTo.slice(0, 10)}.csv`;
}

function runExport<TRow extends CsvRow>(
  tab: ShowRunReviewExportTab,
  rows: TRow[],
  columns: CsvColumn<TRow>[],
  { dateFrom, dateTo, download = triggerBrowserDownload }: ExportOptions,
): void {
  const content = serializeRowsToCsv({ rows, columns });
  download({ content, mimeType: CSV_MIME, filename: fileName(tab, dateFrom, dateTo) });
}

// --- creators ---
export const CREATOR_CSV_COLUMNS: CsvColumn<CsvRow>[] = [
  { key: 'creator_name', label: 'Creator' },
  { key: 'show_name', label: 'Show' },
  { key: 'show_start_time', label: 'Show Start' },
  { key: 'status', label: 'Status' },
  { key: 'late_minutes', label: 'Late (min)' },
  { key: 'reason', label: 'Reason' },
];

export function toCreatorCsvRow(r: ShowRunReviewCreatorException): CsvRow {
  return {
    creator_name: s(r.creator_name),
    show_name: s(r.show_name),
    show_start_time: s(r.show_start_time),
    status: s(r.status),
    late_minutes: s(r.late_minutes),
    reason: s(r.reason),
  };
}

export function exportShowRunReviewCreators(rows: ShowRunReviewCreatorException[], opts: ExportOptions): void {
  runExport('creators', rows.map(toCreatorCsvRow), CREATOR_CSV_COLUMNS, opts);
}

// --- violations ---
export const VIOLATION_CSV_COLUMNS: CsvColumn<CsvRow>[] = [
  { key: 'platform_name', label: 'Platform' },
  { key: 'show_name', label: 'Show' },
  { key: 'show_start_time', label: 'Show Start' },
  { key: 'violation_type', label: 'Type' },
  { key: 'severity', label: 'Severity' },
  { key: 'reason', label: 'Reason' },
  { key: 'observed_at', label: 'Observed At' },
];

export function toViolationCsvRow(r: ShowRunReviewViolation): CsvRow {
  return {
    platform_name: s(r.platform_name),
    show_name: s(r.show_name),
    show_start_time: s(r.show_start_time),
    violation_type: s(r.violation_type),
    severity: s(r.severity),
    reason: s(r.reason),
    observed_at: s(r.observed_at),
  };
}

export function exportShowRunReviewViolations(rows: ShowRunReviewViolation[], opts: ExportOptions): void {
  runExport('violations', rows.map(toViolationCsvRow), VIOLATION_CSV_COLUMNS, opts);
}

// --- tasks ---
export const TASK_CSV_COLUMNS: CsvColumn<CsvRow>[] = [
  { key: 'description', label: 'Task' },
  { key: 'type', label: 'Type' },
  { key: 'status', label: 'Status' },
  { key: 'show_name', label: 'Show' },
];

export function toTaskCsvRow(r: ShowRunReviewTask): CsvRow {
  return {
    description: s(r.description),
    type: s(r.type),
    status: s(r.status),
    show_name: s(r.show_name),
  };
}

export function exportShowRunReviewTasks(rows: ShowRunReviewTask[], opts: ExportOptions): void {
  runExport('tasks', rows.map(toTaskCsvRow), TASK_CSV_COLUMNS, opts);
}

// --- shows ---
export const SHOW_CSV_COLUMNS: CsvColumn<CsvRow>[] = [
  { key: 'shows_range', label: 'Shows' },
  { key: 'actuals_completeness', label: 'Completeness' },
  { key: 'status', label: 'Status' },
];

export function toShowCsvRow(r: ShowRunReviewShow): CsvRow {
  return {
    shows_range: s(r.shows_range),
    actuals_completeness: s(r.actuals_completeness),
    status: s(r.status),
  };
}

export function exportShowRunReviewShows(rows: ShowRunReviewShow[], opts: ExportOptions): void {
  runExport('shows', rows.map(toShowCsvRow), SHOW_CSV_COLUMNS, opts);
}
