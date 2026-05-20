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
  show_creator_id: string;
  creator_id: string;
  creator_name: string;
  creator_alias: string;
  compensation_type: string;
  fixed_cost: string;
};

type CreatorMappingExportBaseRow = Omit<
  CreatorMappingExportRow,
  'show_creator_id' | 'creator_id' | 'creator_name' | 'creator_alias' | 'compensation_type' | 'fixed_cost'
>;

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
  { key: 'show_creator_id', label: 'Show Creator ID' },
  { key: 'creator_id', label: 'Creator ID' },
  { key: 'creator_name', label: 'Creator Name' },
  { key: 'creator_alias', label: 'Creator Alias' },
  { key: 'compensation_type', label: 'Compensation Type' },
  { key: 'fixed_cost', label: 'Fixed Cost' },
];

function formatPlatforms(show: StudioShow): string {
  return show.platforms
    .map((platform) => platform.name)
    .filter((name) => name.length > 0)
    .join('; ');
}

function buildBaseRow(
  show: StudioShow,
  formatDateTime: (value: string) => string,
): CreatorMappingExportBaseRow {
  return {
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
  };
}

function getFixedCost(creator: StudioShow['creators'][number]): string {
  return creator.compensation_type === 'FIXED' ? creator.agreed_rate ?? '' : '';
}

export function buildCreatorMappingExportRows({
  shows,
  formatDateTime,
}: BuildCreatorMappingExportRowsParams): CreatorMappingExportResult {
  const rows = shows.flatMap((show) => {
    const baseRow = buildBaseRow(show, formatDateTime);

    if (show.creators.length === 0) {
      return [{
        ...baseRow,
        show_creator_id: '',
        creator_id: '',
        creator_name: '',
        creator_alias: '',
        compensation_type: '',
        fixed_cost: '',
      }];
    }

    return show.creators.map((creator) => ({
      ...baseRow,
      show_creator_id: creator.show_creator_id,
      creator_id: creator.creator_id,
      creator_name: creator.creator_name,
      creator_alias: creator.creator_alias_name ?? '',
      compensation_type: creator.compensation_type ?? '',
      fixed_cost: getFixedCost(creator),
    }));
  });

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
