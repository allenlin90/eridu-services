import type { StudioShow } from '../api/get-studio-shows';

import { getShowActualsStatus, type ShowActualsStatus } from './show-actuals.utils';

import type { CsvColumn } from '@/lib/csv';
import { serializeRowsToCsv } from '@/lib/csv';

const ACTUALS_STATUS_LABELS: Record<ShowActualsStatus, string> = {
  complete: 'Complete',
  incomplete: 'Incomplete',
  missing: 'Missing',
};

export type StudioShowExportFormat = 'csv' | 'json';

export type StudioShowExportRow = {
  id: string;
  name: string;
  client_name: string;
  schedule_name: string;
  show_status: string;
  show_type: string;
  show_standard: string;
  platforms: string;
  creators: string;
  planned_start: string;
  planned_end: string;
  actual_start: string;
  actual_end: string;
  actuals_status: string;
  task_total: string;
  task_assigned: string;
  task_unassigned: string;
  task_completed: string;
  updated_at: string;
};

export type StudioShowExportResult = {
  rows: StudioShowExportRow[];
  columns: CsvColumn<StudioShowExportRow>[];
};

type BuildStudioShowExportRowsParams = {
  shows: StudioShow[];
  formatDateTime: (value: string) => string;
};

type BuildStudioShowExportFilenameParams = {
  format: StudioShowExportFormat;
  dateFrom?: string;
  dateTo?: string;
  exportedAt?: Date;
};

const SHOW_EXPORT_COLUMNS: CsvColumn<StudioShowExportRow>[] = [
  { key: 'id', label: 'Show ID' },
  { key: 'name', label: 'Show Name' },
  { key: 'client_name', label: 'Client' },
  { key: 'schedule_name', label: 'Schedule' },
  { key: 'show_status', label: 'Status' },
  { key: 'show_type', label: 'Show Type' },
  { key: 'show_standard', label: 'Show Standard' },
  { key: 'platforms', label: 'Platforms' },
  { key: 'creators', label: 'Creators' },
  { key: 'planned_start', label: 'Planned Start' },
  { key: 'planned_end', label: 'Planned End' },
  { key: 'actual_start', label: 'Actual Start' },
  { key: 'actual_end', label: 'Actual End' },
  { key: 'actuals_status', label: 'Actuals Status' },
  { key: 'task_total', label: 'Task Total' },
  { key: 'task_assigned', label: 'Task Assigned' },
  { key: 'task_unassigned', label: 'Task Unassigned' },
  { key: 'task_completed', label: 'Task Completed' },
  { key: 'updated_at', label: 'Updated At' },
];

function formatCreators(show: StudioShow): string {
  return show.creators
    .map((creator) => {
      if (creator.creator_alias_name) {
        return `${creator.creator_name} (${creator.creator_alias_name})`;
      }
      return creator.creator_name;
    })
    .join('; ');
}

function formatPlatforms(show: StudioShow): string {
  return show.platforms
    .map((platform) => platform.name)
    .filter((name) => name.length > 0)
    .join('; ');
}

export function buildStudioShowExportRows({
  shows,
  formatDateTime,
}: BuildStudioShowExportRowsParams): StudioShowExportResult {
  const rows = shows.map((show) => ({
    id: show.id,
    name: show.name,
    client_name: show.client_name ?? '',
    schedule_name: show.schedule_name ?? '',
    show_status: show.show_status_name ?? '',
    show_type: show.show_type_name ?? '',
    show_standard: show.show_standard_name ?? '',
    platforms: formatPlatforms(show),
    creators: formatCreators(show),
    planned_start: formatDateTime(show.start_time),
    planned_end: formatDateTime(show.end_time),
    actual_start: show.actual_start_time ? formatDateTime(show.actual_start_time) : '',
    actual_end: show.actual_end_time ? formatDateTime(show.actual_end_time) : '',
    actuals_status: ACTUALS_STATUS_LABELS[getShowActualsStatus(show)],
    task_total: String(show.task_summary.total),
    task_assigned: String(show.task_summary.assigned),
    task_unassigned: String(show.task_summary.unassigned),
    task_completed: String(show.task_summary.completed),
    updated_at: formatDateTime(show.updated_at),
  }));

  return { rows, columns: SHOW_EXPORT_COLUMNS };
}

export function serializeStudioShowExportCsv(result: StudioShowExportResult): string {
  return serializeRowsToCsv(result);
}

export function serializeStudioShowExportJson(rows: StudioShowExportRow[]): string {
  return JSON.stringify(rows, null, 2);
}

export function createStudioShowExportContent(
  result: StudioShowExportResult,
  format: StudioShowExportFormat,
): string {
  if (format === 'json') {
    return serializeStudioShowExportJson(result.rows);
  }

  return serializeStudioShowExportCsv(result);
}

export function buildStudioShowExportFilename({
  format,
  dateFrom,
  dateTo,
  exportedAt = new Date(),
}: BuildStudioShowExportFilenameParams): string {
  const scope = dateFrom && dateTo ? `${dateFrom}_to_${dateTo}` : 'current-view';
  const stamp = exportedAt.toISOString().replace(/\.\d{3}Z$/, '').replace('T', '_').replace(/:/g, '-');
  return `studio-shows-${scope}-${stamp}.${format}`;
}
