import type { StudioShift } from '@/features/studio-shifts/api/studio-shifts.types';
import { type CsvColumn, serializeRowsToCsv } from '@/lib/csv';

type MemberInfo = { name: string; email: string };

export type StudioShiftExportFormat = 'csv' | 'json';

export type StudioShiftExportRow = {
  id: string;
  member_name: string;
  member_email: string;
  date: string;
  window: string;
  blocks: string;
  total_hours: string;
  projected_cost: string;
  calculated_cost: string;
  status: string;
  duty_manager: string;
  updated_at: string;
};

type BuildStudioShiftExportRowsParams = {
  shifts: StudioShift[];
  memberMap: Map<string, MemberInfo>;
  getShiftDisplayDate: (shift: StudioShift) => string;
  getShiftBlockLabels: (shift: StudioShift) => string[];
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

const STUDIO_SHIFT_EXPORT_COLUMNS: CsvColumn<StudioShiftExportRow>[] = [
  { key: 'id', label: 'Shift ID' },
  { key: 'member_name', label: 'Member' },
  { key: 'member_email', label: 'Member Email' },
  { key: 'date', label: 'Date' },
  { key: 'window', label: 'Window' },
  { key: 'blocks', label: 'Blocks' },
  { key: 'total_hours', label: 'Total Hours' },
  { key: 'projected_cost', label: 'Projected Cost' },
  { key: 'calculated_cost', label: 'Calculated Cost' },
  { key: 'status', label: 'Status' },
  { key: 'duty_manager', label: 'Duty Manager' },
  { key: 'updated_at', label: 'Updated At' },
];

export function buildStudioShiftExportRows({
  shifts,
  memberMap,
  getShiftDisplayDate,
  getShiftBlockLabels,
  getShiftWindowLabel,
  formatDateTime,
}: BuildStudioShiftExportRowsParams): StudioShiftExportRow[] {
  return shifts.map((shift) => {
    const member = memberMap.get(shift.user_id);

    return {
      id: shift.id,
      member_name: shift.user_name,
      member_email: member?.email ?? '',
      date: getShiftDisplayDate(shift),
      window: getShiftWindowLabel(shift),
      blocks: getShiftBlockLabels(shift).join('; '),
      total_hours: formatShiftDurationHours(shift),
      projected_cost: shift.projected_cost,
      calculated_cost: shift.calculated_cost ?? '',
      status: shift.status,
      duty_manager: shift.is_duty_manager ? 'Yes' : 'No',
      updated_at: formatDateTime(shift.updated_at),
    };
  });
}

export function serializeStudioShiftExportCsv(rows: StudioShiftExportRow[]): string {
  return serializeRowsToCsv({ rows, columns: STUDIO_SHIFT_EXPORT_COLUMNS });
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
  rows: StudioShiftExportRow[],
  format: StudioShiftExportFormat,
): string {
  if (format === 'json') {
    return serializeStudioShiftExportJson(rows);
  }

  return serializeStudioShiftExportCsv(rows);
}
