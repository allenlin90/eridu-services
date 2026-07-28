import { DataTable, DataTablePagination } from '@eridu/ui';

import type { SceneQcSearch } from '../config/scene-qc-search-schema';
import { useSceneQcRecords } from '../hooks/use-scene-qc-records';

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

      <DataTable
        data={data}
        columns={sceneQcRecordsColumns}
        isLoading={recordsQuery.isLoading}
        isFetching={recordsQuery.isFetching}
        manualPagination
        emptyMessage="No Scene QC records for this range."
        onRowClick={(row) => controller.selectRecord(row.review_id)}
      />

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
