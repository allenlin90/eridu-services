import type { StudioShift, StudioShiftBlock } from '@/features/studio-shifts/api/studio-shifts.types';
import { type CsvColumn, serializeRowsToCsv } from '@/lib/csv';

type MemberInfo = { name: string; email: string };

export type StudioShiftExportFormat = 'csv' | 'json';

export type StudioShiftStaticExportRow = {
  id: string;
  member_name: string;
  member_email: string;
  date: string;
  window: string;
  total_hours: string;
  planned_cost: string;
  actual_cost: string;
  status: string;
  duty_manager: string;
  updated_at: string;
};

// Per-block columns are dynamic — the column set depends on the max number of
// blocks across all exported shifts. The key shape is
// `block_${N}_(planned|actual)_(start|end)` (1-indexed). Sparse cells are empty strings.
export type StudioShiftExportRow = StudioShiftStaticExportRow & Record<string, string>;

export type StudioShiftExportResult = {
  rows: StudioShiftExportRow[];
  columns: CsvColumn<StudioShiftExportRow>[];
};

type BuildStudioShiftExportRowsParams = {
  shifts: StudioShift[];
  memberMap: Map<string, MemberInfo>;
  getShiftDisplayDate: (shift: StudioShift) => string;
  getShiftWindowLabel: (shift: StudioShift) => string;
  formatDateTime: (value: string) => string;
};

type BuildStudioShiftExportFilenameParams = {
  format: StudioShiftExportFormat;
  dateFrom?: string;
  dateTo?: string;
  exportedAt?: Date;
};

function formatShiftDurationHours(shift: StudioShift): string {
  const totalMs = shift.blocks.reduce((acc, block) => {
    return acc + (new Date(block.end_time).getTime() - new Date(block.start_time).getTime());
  }, 0);

  return (totalMs / (1000 * 60 * 60)).toFixed(2);
}

const STATIC_EXPORT_COLUMNS: CsvColumn<StudioShiftExportRow>[] = [
  { key: 'id', label: 'Shift ID' },
  { key: 'member_name', label: 'Member' },
  { key: 'member_email', label: 'Member Email' },
  { key: 'date', label: 'Date' },
  { key: 'window', label: 'Window' },
  { key: 'total_hours', label: 'Total Hours' },
  { key: 'planned_cost', label: 'Planned Cost' },
  { key: 'actual_cost', label: 'Actual Cost' },
  { key: 'status', label: 'Status' },
  { key: 'duty_manager', label: 'Duty Manager' },
  { key: 'updated_at', label: 'Updated At' },
];

function sortedShiftBlocks(shift: StudioShift): StudioShiftBlock[] {
  // Backend orders blocks by startTime ascending; sort defensively in case any
  // caller passes an unsorted shape.
  return [...shift.blocks].sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
  );
}

function buildBlockColumns(maxBlocks: number): CsvColumn<StudioShiftExportRow>[] {
  const columns: CsvColumn<StudioShiftExportRow>[] = [];
  for (let n = 1; n <= maxBlocks; n += 1) {
    columns.push(
      { key: `block_${n}_planned_start`, label: `Block ${n} Planned Start` },
      { key: `block_${n}_planned_end`, label: `Block ${n} Planned End` },
      { key: `block_${n}_actual_start`, label: `Block ${n} Actual Start` },
      { key: `block_${n}_actual_end`, label: `Block ${n} Actual End` },
    );
  }
  return columns;
}

export function buildStudioShiftExportRows({
  shifts,
  memberMap,
  getShiftDisplayDate,
  getShiftWindowLabel,
  formatDateTime,
}: BuildStudioShiftExportRowsParams): StudioShiftExportResult {
  const maxBlocks = shifts.reduce((max, shift) => Math.max(max, shift.blocks.length), 0);
  const blockColumns = buildBlockColumns(maxBlocks);
  const columns = [...STATIC_EXPORT_COLUMNS, ...blockColumns];

  const rows = shifts.map((shift) => {
    const member = memberMap.get(shift.user_id);
    const orderedBlocks = sortedShiftBlocks(shift);

    const row: StudioShiftExportRow = {
      id: shift.id,
      member_name: shift.user_name,
      member_email: member?.email ?? '',
      date: getShiftDisplayDate(shift),
      window: getShiftWindowLabel(shift),
      total_hours: formatShiftDurationHours(shift),
      planned_cost: shift.planned_cost,
      actual_cost: shift.actual_cost ?? '',
      status: shift.status,
      duty_manager: shift.is_duty_manager ? 'Yes' : 'No',
      updated_at: formatDateTime(shift.updated_at),
    };

    // Per-block columns: planned_start/end always present (the block defines them);
    // actual_start/end empty when the actuals haven't been recorded yet.
    for (let n = 1; n <= maxBlocks; n += 1) {
      const block = orderedBlocks[n - 1];
      row[`block_${n}_planned_start`] = block ? formatDateTime(block.start_time) : '';
      row[`block_${n}_planned_end`] = block ? formatDateTime(block.end_time) : '';
      row[`block_${n}_actual_start`] = block?.actual_start_time ? formatDateTime(block.actual_start_time) : '';
      row[`block_${n}_actual_end`] = block?.actual_end_time ? formatDateTime(block.actual_end_time) : '';
    }

    return row;
  });

  return { rows, columns };
}

export function serializeStudioShiftExportCsv({ rows, columns }: StudioShiftExportResult): string {
  return serializeRowsToCsv({ rows, columns });
}

export function serializeStudioShiftExportJson(rows: StudioShiftExportRow[]): string {
  return JSON.stringify(rows, null, 2);
}

export function buildStudioShiftExportFilename({
  format,
  dateFrom,
  dateTo,
  exportedAt = new Date(),
}: BuildStudioShiftExportFilenameParams): string {
  const scope = dateFrom && dateTo ? `${dateFrom}_to_${dateTo}` : 'current-view';
  const stamp = exportedAt.toISOString().replace(/\.\d{3}Z$/, '').replace('T', '_').replace(/:/g, '-');
  return `studio-shifts-${scope}-${stamp}.${format}`;
}

export function createStudioShiftExportContent(
  result: StudioShiftExportResult,
  format: StudioShiftExportFormat,
): string {
  if (format === 'json') {
    return serializeStudioShiftExportJson(result.rows);
  }

  return serializeStudioShiftExportCsv(result);
}
