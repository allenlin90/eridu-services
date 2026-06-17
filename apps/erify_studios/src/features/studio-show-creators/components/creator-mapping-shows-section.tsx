import { Download, Loader2, RefreshCw, UserRound } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { STUDIO_ROLE } from '@eridu/api-types/memberships';
import {
  adaptColumnFiltersChange,
  adaptPaginationChange,
  Button,
  DataTable,
  DataTablePagination,
  DataTableToolbar,
} from '@eridu/ui';

import { useShowLookupsQuery } from '@/features/shows/api/get-show-lookups';
import { formatDateTime } from '@/features/studio-shifts/utils/shift-form.utils';
import { BulkCreatorAssignmentDialog } from '@/features/studio-show-creators/components/bulk-creator-assignment-dialog';
import { getCreatorMappingShowColumns } from '@/features/studio-show-creators/components/creator-mapping-show-columns';
import { SelectedCreatorMappingMobileActions } from '@/features/studio-show-creators/components/selected-creator-mapping-mobile-actions';
import { useCreatorMappingClientFilter } from '@/features/studio-show-creators/hooks/use-creator-mapping-client-filter';
import { useCreatorMappingCreatorFilter } from '@/features/studio-show-creators/hooks/use-creator-mapping-creator-filter';
import { useCreatorMappingShows } from '@/features/studio-show-creators/hooks/use-creator-mapping-shows';
import {
  buildCreatorMappingExportFilename,
  buildCreatorMappingExportRows,
  serializeCreatorMappingExportCsv,
} from '@/features/studio-show-creators/utils/creator-mapping-export.utils';
import {
  getAllStudioShowsForExport,
  SHOW_EXPORT_MAX_RECORDS,
  ShowExportTooLargeError,
} from '@/features/studio-shows/api/get-studio-shows';
import { useSelectedRowSnapshots } from '@/features/studio-shows/hooks/use-selected-row-snapshots';
import { toApiDate } from '@/features/studio-shows/utils/planning-scope.utils';
import { useAbortableAction } from '@/hooks/use-abortable-action';
import { triggerBrowserDownload } from '@/lib/file-download';
import { useStudioAccess } from '@/lib/hooks/use-studio-access';

/**
 * Shows table section of the Creator Mapping page. Self-contained: owns its own
 * `useCreatorMappingShows` query (paginated/filtered via URL state), row
 * selection, async client/creator combobox filters, CSV export, and the bulk
 * **Assign Creators** dialog. Receives the committed planning scope as props
 * from {@link useCreatorMappingPageController}.
 */
export function CreatorMappingShowsSection({
  studioId,
  scopeDateFrom,
  scopeDateTo,
  scopeLabel,
}: {
  studioId: string;
  scopeDateFrom?: string;
  scopeDateTo?: string;
  scopeLabel: string;
}) {
  const [isBulkAssignDialogOpen, setIsBulkAssignDialogOpen] = useState(false);
  const { isRunning: isExporting, run: runExport } = useAbortableAction();
  const { role } = useStudioAccess(studioId);
  const isAccountManager = role === STUDIO_ROLE.ACCOUNT_MANAGER;

  const columns = useMemo(() => getCreatorMappingShowColumns(isAccountManager), [isAccountManager]);

  const {
    shows,
    total,
    pageCount,
    isLoading,
    isFetching,
    refetch,
    pagination,
    onPaginationChange,
    columnFilters,
    onColumnFiltersChange,
    queryParams,
  } = useCreatorMappingShows({
    studioId,
    dateFrom: scopeDateFrom,
    dateTo: scopeDateTo,
  });

  const {
    rowSelection,
    selectedItems: selectedShows,
    onRowSelectionChange: handleRowSelectionChange,
    clearSelection: clearSelectedShows,
  } = useSelectedRowSnapshots(shows);

  const { data: showLookups } = useShowLookupsQuery(studioId);

  const selectedClientId = useMemo(() => {
    const filter = columnFilters.find((cf) => cf.id === 'client_id');
    return typeof filter?.value === 'string' && filter.value ? filter.value : undefined;
  }, [columnFilters]);

  const {
    options: clientOptions,
    isLoading: isClientFilterLoading,
    setSearch: setClientFilterSearch,
  } = useCreatorMappingClientFilter(studioId, selectedClientId);
  const selectedCreatorName = useMemo(() => {
    const filter = columnFilters.find((cf) => cf.id === 'creator_name');
    return typeof filter?.value === 'string' && filter.value ? filter.value : undefined;
  }, [columnFilters]);
  const {
    options: creatorOptions,
    isLoading: isCreatorFilterLoading,
    setSearch: setCreatorFilterSearch,
  } = useCreatorMappingCreatorFilter(studioId, selectedCreatorName);

  const searchableColumns = useMemo(
    () => [
      { id: 'name', title: 'Show Name', type: 'text' as const },
      {
        id: 'creator_name',
        title: 'Creator',
        type: 'combobox' as const,
        options: creatorOptions,
        onSearch: setCreatorFilterSearch,
        isLoading: isCreatorFilterLoading,
        placeholder: 'Filter by creator',
      },
      {
        id: 'has_creators',
        title: 'Creator Mapping',
        type: 'select' as const,
        options: [
          { value: 'true', label: 'Mapped' },
          { value: 'false', label: 'Unmapped' },
        ],
      },
      {
        id: 'client_id',
        title: 'Client',
        type: 'combobox' as const,
        options: clientOptions,
        onSearch: setClientFilterSearch,
        isLoading: isClientFilterLoading,
        placeholder: 'Filter by client',
      },
      {
        id: 'show_status_name',
        title: 'Show Status',
        type: 'select' as const,
        options: (showLookups?.show_statuses ?? []).map((status) => ({ value: status.name, label: status.name })),
      },
    ],
    [
      clientOptions,
      creatorOptions,
      isClientFilterLoading,
      isCreatorFilterLoading,
      setClientFilterSearch,
      setCreatorFilterSearch,
      showLookups?.show_statuses,
    ],
  );
  const handleExport = useCallback(async () => {
    await runExport(async (signal) => {
      try {
        const {
          page: _page,
          limit: _limit,
          ...exportParams
        } = queryParams;
        const exportShows = await getAllStudioShowsForExport(studioId, exportParams, { signal });
        if (signal.aborted) {
          return;
        }

        const exportResult = buildCreatorMappingExportRows({
          shows: exportShows,
          formatDateTime,
        });
        triggerBrowserDownload({
          content: serializeCreatorMappingExportCsv(exportResult),
          mimeType: 'text/csv;charset=utf-8;',
          filename: buildCreatorMappingExportFilename({
            dateFrom: toApiDate(scopeDateFrom),
            dateTo: toApiDate(scopeDateTo),
          }),
        });
      } catch (error) {
        if (signal.aborted) {
          return;
        }
        if (error instanceof ShowExportTooLargeError) {
          toast.error(`Selection exceeds the ${SHOW_EXPORT_MAX_RECORDS.toLocaleString()}-show export limit (${error.totalRecords.toLocaleString()} matched). Narrow the date range or filters and retry.`);
          return;
        }
        toast.error(error instanceof Error ? error.message : 'Failed to export creator mapping. Please try again.');
      }
    });
  }, [queryParams, runExport, scopeDateFrom, scopeDateTo, studioId]);

  return (
    <>
      <p className="text-xs text-muted-foreground">
        Showing shows in scope:
        {' '}
        {scopeLabel}
      </p>

      <DataTable
        data={shows}
        columns={columns}
        isLoading={isLoading}
        isFetching={isFetching}
        emptyMessage="No shows found for creator mapping."
        manualPagination
        manualFiltering
        pageCount={pageCount}
        paginationState={{
          pageIndex: pagination.pageIndex,
          pageSize: pagination.pageSize,
        }}
        onPaginationChange={adaptPaginationChange(pagination, onPaginationChange)}
        columnFilters={columnFilters}
        onColumnFiltersChange={adaptColumnFiltersChange(columnFilters, onColumnFiltersChange)}
        enableRowSelection={!isAccountManager}
        rowSelection={rowSelection}
        onRowSelectionChange={handleRowSelectionChange}
        getRowId={(show) => show.id}
        renderToolbar={(table) => (
          <DataTableToolbar
            table={table}
            searchColumn="name"
            searchableColumns={searchableColumns}
            featuredFilterColumns={['has_creators', 'client_id', 'show_status_name', 'creator_name']}
            searchPlaceholder="Search shows..."
          >
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={() => void handleExport()}
              disabled={isExporting || total === 0}
              aria-busy={isExporting}
            >
              {isExporting
                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                : <Download className="mr-2 h-4 w-4" />}
              {isExporting ? 'Exporting…' : 'Export CSV'}
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={() => refetch()}
              disabled={isFetching}
              aria-label="Refresh creator mapping shows"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
          </DataTableToolbar>
        )}
        renderFooter={() => (
          <DataTablePagination
            pagination={{
              pageIndex: pagination.pageIndex,
              pageSize: pagination.pageSize,
              total,
              pageCount,
            }}
            onPaginationChange={onPaginationChange}
          />
        )}
      />

      {selectedShows.length > 0 && (
        <>
          <div className="fixed bottom-6 left-1/2 z-50 hidden -translate-x-1/2 items-center justify-between gap-4 rounded-full border bg-slate-900 px-6 py-3 text-slate-50 shadow-lg animate-in slide-in-from-bottom-5 dark:bg-slate-50 dark:text-slate-900 md:flex">
            <div className="flex items-center gap-2 border-r border-slate-700 pr-4 dark:border-slate-300">
              <span className="text-sm font-medium">
                {selectedShows.length}
                {' '}
                selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                className="rounded-full"
                onClick={() => setIsBulkAssignDialogOpen(true)}
              >
                <UserRound className="mr-2 h-4 w-4" />
                Assign Creators
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="ml-2 rounded-full hover:bg-slate-800 hover:text-white dark:hover:bg-slate-200 dark:hover:text-black"
                onClick={clearSelectedShows}
              >
                Cancel
              </Button>
            </div>
          </div>

          <SelectedCreatorMappingMobileActions
            selectedCount={selectedShows.length}
            onAssign={() => setIsBulkAssignDialogOpen(true)}
            onClear={clearSelectedShows}
          />
        </>
      )}

      <BulkCreatorAssignmentDialog
        studioId={studioId}
        shows={selectedShows}
        open={isBulkAssignDialogOpen}
        onOpenChange={setIsBulkAssignDialogOpen}
        onSuccess={() => {
          clearSelectedShows();
          void refetch();
        }}
      />
    </>
  );
}
