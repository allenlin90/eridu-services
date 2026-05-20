import type { StudioShow } from '@/features/studio-shows/api/get-studio-shows';
import type { CsvColumn } from '@/lib/csv';
import { serializeRowsToCsv } from '@/lib/csv';

export type CreatorMappingExportRow = {
  show_name: string;
  show_id: string;
  client_name: string;
  show_status: string;
  scheduled_start: string;
  scheduled_end: string;
  actual_start: string;
  actual_end: string;
  platforms: string;
  room: string;
  show_type: string;
  show_standard: string;
  mapped_state: string;
  creators: string;
};

export type CreatorMappingExportResult = {
  rows: CreatorMappingExportRow[];
  columns: CsvColumn<CreatorMappingExportRow>[];
};

type BuildCreatorMappingExportRowsParams = {
  shows: StudioShow[];
  formatDateTime: (value: string) => string;
};

type BuildCreatorMappingExportFilenameParams = {
  dateFrom?: string;
  dateTo?: string;
  exportedAt?: Date;
};

const CREATOR_MAPPING_EXPORT_COLUMNS: CsvColumn<CreatorMappingExportRow>[] = [
  { key: 'show_name', label: 'Show Name' },
  { key: 'show_id', label: 'Show ID' },
  { key: 'client_name', label: 'Client' },
  { key: 'show_status', label: 'Status' },
  { key: 'scheduled_start', label: 'Scheduled Start' },
  { key: 'scheduled_end', label: 'Scheduled End' },
  { key: 'actual_start', label: 'Actual Start' },
  { key: 'actual_end', label: 'Actual End' },
  { key: 'platforms', label: 'Platforms' },
  { key: 'room', label: 'Room' },
  { key: 'show_type', label: 'Show Type' },
  { key: 'show_standard', label: 'Show Standard' },
  { key: 'mapped_state', label: 'Mapped State' },
  { key: 'creators', label: 'Creators' },
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

export function buildCreatorMappingExportRows({
  shows,
  formatDateTime,
}: BuildCreatorMappingExportRowsParams): CreatorMappingExportResult {
  const rows = shows.map((show) => ({
    show_name: show.name,
    show_id: show.id,
    client_name: show.client_name ?? '',
    show_status: show.show_status_name ?? '',
    scheduled_start: formatDateTime(show.start_time),
    scheduled_end: formatDateTime(show.end_time),
    actual_start: show.actual_start_time ? formatDateTime(show.actual_start_time) : '',
    actual_end: show.actual_end_time ? formatDateTime(show.actual_end_time) : '',
    platforms: formatPlatforms(show),
    room: show.studio_room_name ?? '',
    show_type: show.show_type_name ?? '',
    show_standard: show.show_standard_name ?? '',
    mapped_state: show.creators.length > 0 ? 'Mapped' : 'Unmapped',
    creators: formatCreators(show),
  }));

  return { rows, columns: CREATOR_MAPPING_EXPORT_COLUMNS };
}

export function serializeCreatorMappingExportCsv(result: CreatorMappingExportResult): string {
  return serializeRowsToCsv(result);
}

export function buildCreatorMappingExportFilename({
  dateFrom,
  dateTo,
  exportedAt = new Date(),
}: BuildCreatorMappingExportFilenameParams): string {
  const scope = dateFrom && dateTo ? `${dateFrom}_to_${dateTo}` : 'current-view';
  const stamp = exportedAt.toISOString().replace(/\.\d{3}Z$/, '').replace('T', '_').replace(/:/g, '-');
  return `creator-mapping-${scope}-${stamp}.csv`;
}
