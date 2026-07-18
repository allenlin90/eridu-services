import type { ColumnDef, PaginationState, Updater } from '@tanstack/react-table';
import { format } from 'date-fns';
import { useMemo } from 'react';

import type { PublishRunRow } from '@eridu/api-types/shows';
import { Badge, Button, DataTable, DataTablePagination } from '@eridu/ui';

const SOURCE_LABELS: Record<PublishRunRow['source'], string> = {
  google_sheets_sync: 'Google Sheets',
  studio_native_snapshot: 'Studio native',
};

/** Summary keys worth surfacing per run; anything absent or zero is skipped. */
const SUMMARY_COUNTS: { key: string; label: string }[] = [
  { key: 'shows_created', label: 'created' },
  { key: 'shows_updated', label: 'updated' },
  { key: 'shows_preserved', label: 'preserved' },
  { key: 'shows_skipped', label: 'skipped' },
  { key: 'shows_cancelled', label: 'cancelled' },
  { key: 'shows_pending_resolution', label: 'pending resolution' },
  { key: 'creator_mappings_backfilled', label: 'creators backfilled' },
  { key: 'publish_impacts_recorded', label: 'impacts' },
];

export type PublishRunsTableProps = {
  rows: PublishRunRow[];
  total: number;
  pageCount: number;
  isLoading: boolean;
  isFetching: boolean;
  paginationState: PaginationState;
  onPaginationChange: (updater: Updater<PaginationState>) => void;
  onViewImpacts: (runId: string) => void;
};

export function PublishRunsTable({
  rows,
  total,
  pageCount,
  isLoading,
  isFetching,
  paginationState,
  onPaginationChange,
  onViewImpacts,
}: PublishRunsTableProps) {
  const columns = useMemo(() => createColumns(onViewImpacts), [onViewImpacts]);

  return (
    <DataTable
      data={rows}
      columns={columns}
      isLoading={isLoading}
      isFetching={isFetching}
      emptyMessage="No publish runs recorded yet. Runs appear here after the next schedule publish."
      manualPagination
      pageCount={pageCount}
      paginationState={paginationState}
      onPaginationChange={onPaginationChange}
      renderFooter={() => (
        <DataTablePagination
          pagination={{
            pageIndex: paginationState.pageIndex,
            pageSize: paginationState.pageSize,
            total,
            pageCount,
          }}
          onPaginationChange={onPaginationChange}
        />
      )}
    />
  );
}

function createColumns(onViewImpacts: (runId: string) => void): ColumnDef<PublishRunRow>[] {
  return [
    {
      id: 'run',
      header: 'Publish run',
      cell: ({ row }) => (
        <div className="space-y-1">
          <Badge variant="secondary">{SOURCE_LABELS[row.original.source] ?? row.original.source}</Badge>
          <div className="text-xs text-muted-foreground font-mono">{row.original.id}</div>
        </div>
      ),
    },
    {
      id: 'triggered_by',
      header: 'Triggered by',
      cell: ({ row }) => row.original.triggered_by?.name ?? 'System',
    },
    {
      id: 'summary',
      header: 'Result',
      cell: ({ row }) => {
        const parts = SUMMARY_COUNTS
          .map(({ key, label }) => ({ label, value: row.original.summary[key] ?? 0 }))
          .filter(({ value }) => value > 0)
          .map(({ label, value }) => `${value} ${label}`);
        return parts.length > 0
          ? <span className="text-sm">{parts.join(' · ')}</span>
          : <span className="text-xs text-muted-foreground">No changes</span>;
      },
    },
    {
      id: 'created_at',
      header: 'Published at',
      cell: ({ row }) => format(new Date(row.original.created_at), 'MMM d, yyyy h:mm a'),
    },
    {
      id: 'view_impacts',
      header: '',
      cell: ({ row }) => (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onViewImpacts(row.original.id)}
        >
          View impacts
        </Button>
      ),
    },
  ];
}
