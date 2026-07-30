import { Badge, DataTable, DataTablePagination, Skeleton } from '@eridu/ui';

import type { SceneQcSearch } from '../config/scene-qc-search-schema';
import { useSceneQcRecords } from '../hooks/use-scene-qc-records';
import { resolveSceneQcResultChip } from '../lib/scene-qc-result-chip';

import { SceneQcRecordDetailSheet } from './scene-qc-record-detail-sheet';
import { sceneQcRecordsColumns } from './scene-qc-records-columns';
import { SceneQcRecordsFilters } from './scene-qc-records-filters';

type SceneQcRecordsViewProps = {
  studioId: string;
  search: SceneQcSearch;
  onSearchChange: (next: Partial<SceneQcSearch>) => void;
  onOpenReport: (confirmationId: string) => void;
};

/**
 * §7.5 container: filters + server-paginated table + detail surface.
 * Records paginates in SQL, so `DataTable` is driven with
 * `manualPagination` off `search.page`/`search.limit` directly rather than
 * `useTableUrlState` -- that hook's dynamic-filter tracking would also
 * absorb the daily tab's unrelated URL params (`date`, `show_id`,
 * `review_state`, `search`) sharing this same route, silently clobbering
 * them on a Records filter change. Mirrors `use-scene-qc-daily.ts`'s
 * explicit handler shape instead (OQ-36, verified at implementation time).
 */
export function SceneQcRecordsView({ studioId, search, onSearchChange, onOpenReport }: SceneQcRecordsViewProps) {
  const controller = useSceneQcRecords({ studioId, search, onSearchChange });
  const { recordsQuery, detailQuery } = controller;

  const data = recordsQuery.data?.data ?? [];
  const meta = recordsQuery.data?.meta;

  return (
    <div className="min-w-0 space-y-4">
      <SceneQcRecordsFilters
        studioId={studioId}
        dateFrom={controller.dateFrom}
        dateTo={controller.dateTo}
        clientId={search.client_id}
        platformId={search.platform_id}
        result={search.result}
        onDateRangeChange={(range) => controller.changeScope(range)}
        onClientChange={(value) => controller.changeScope({ client_id: value })}
        onPlatformChange={(value) => controller.changeScope({ platform_id: value })}
        onResultChange={(value) => controller.changeScope({ result: value })}
      />

      <div className="space-y-2 md:hidden">
        {recordsQuery.isLoading
          ? ['record-loading-1', 'record-loading-2', 'record-loading-3'].map((key) => (
              <Skeleton key={key} className="h-28 w-full" />
            ))
          : data.length === 0
            ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No Scene QC records for this range.
                </div>
              )
            : data.map((record) => {
                const resultChip = resolveSceneQcResultChip(record.result);
                return (
                  <button
                    key={record.review_id}
                    type="button"
                    className="w-full space-y-2 rounded-lg border bg-card p-4 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => controller.selectRecord(record.review_id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{record.show_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {record.operational_date}
                          {' · '}
                          {new Date(record.scheduled_start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <Badge variant="outline" className={resultChip.className}>{resultChip.label}</Badge>
                    </div>
                    <p className="truncate text-sm text-muted-foreground">
                      {record.client?.name ?? 'No client'}
                      {' · '}
                      {record.platforms.map((platform) => platform.name).join(', ') || 'No platform'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {record.confirmation_status === 'CONFIRMED' ? 'Confirmed' : record.confirmation_status === 'SUPERSEDED' ? 'Superseded' : 'Unconfirmed'}
                      {' · '}
                      {record.reviewed_by.name}
                    </p>
                  </button>
                );
              })}
      </div>

      <div className="hidden md:block">
        <DataTable
          data={data}
          columns={sceneQcRecordsColumns}
          isLoading={recordsQuery.isLoading}
          isFetching={recordsQuery.isFetching}
          manualPagination
          emptyMessage="No Scene QC records for this range."
          onRowClick={(row) => controller.selectRecord(row.review_id)}
        />
      </div>

      {meta
        ? (
            <DataTablePagination
              pagination={{
                pageIndex: search.page - 1,
                pageSize: search.limit,
                total: meta.total,
                pageCount: meta.totalPages,
              }}
              onPaginationChange={({ pageIndex }) => controller.changePage(pageIndex + 1)}
            />
          )
        : null}

      <SceneQcRecordDetailSheet
        studioId={studioId}
        open={Boolean(controller.selectedRecordId)}
        detail={detailQuery.data}
        isLoading={detailQuery.isLoading}
        isError={detailQuery.isError}
        onOpenChange={(open) => {
          if (!open)
            controller.closeDetail();
        }}
        onOpenReport={onOpenReport}
      />
    </div>
  );
}
