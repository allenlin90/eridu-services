import { AlertTriangle, Download, ListTodo, Loader2, RefreshCw } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

import {
  adaptColumnFiltersChange,
  adaptPaginationChange,
  adaptSortingChange,
  Button,
  DataTable,
  DataTablePagination,
  DataTableToolbar,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@eridu/ui';

import { useShowLookupsQuery } from '@/features/shows/api/get-show-lookups';
import { BulkTaskGenerationDialog } from '@/features/shows/components/bulk-task-generation-dialog';
import { ShowAssignmentDialog } from '@/features/shows/components/show-assignment-dialog';
import { formatDateTime } from '@/features/studio-shifts/utils/shift-form.utils';
import {
  getAllStudioShowsForExport,
  SHOW_EXPORT_MAX_RECORDS,
  ShowExportTooLargeError,
  type StudioShow,
} from '@/features/studio-shows/api/get-studio-shows';
import { SelectedShowsMobileActions } from '@/features/studio-shows/components/selected-shows-mobile-actions';
import { ShowActualsDialog } from '@/features/studio-shows/components/show-actuals-dialog';
import { getStudioShowOperationsColumns } from '@/features/studio-shows/components/studio-shows-table/columns';
import { useSelectedRowSnapshots } from '@/features/studio-shows/hooks/use-selected-row-snapshots';
import { useStudioShows } from '@/features/studio-shows/hooks/use-studio-shows';
import {
  buildStudioShowExportFilename,
  buildStudioShowExportRows,
  createStudioShowExportContent,
  type StudioShowExportFormat,
} from '@/features/studio-shows/utils/studio-shows-export.utils';
import { useAbortableAction } from '@/hooks/use-abortable-action';
import { triggerBrowserDownload } from '@/lib/file-download';

const QUICK_FILTER_COLUMNS: string[] = [];
const FEATURED_FILTER_COLUMNS = ['actuals_state', 'has_tasks', 'client_name', 'show_standard_name', 'show_status_name'];

const EMPTY_ATTENTION_SHOW_UIDS: string[] = [];

export function TaskSetupShowsSection({
  studioId,
  scopeDateFrom,
  scopeDateTo,
  scopeLabel,
  needsAttention,
  onShowsMutated,
  onToggleNeedsAttention,
  attentionShowUids = EMPTY_ATTENTION_SHOW_UIDS,
}: {
  studioId: string;
  scopeDateFrom?: string;
  scopeDateTo?: string;
  scopeLabel: string;
  needsAttention: boolean;
  onShowsMutated: () => void;
  onToggleNeedsAttention: () => void;
  attentionShowUids?: string[];
}) {
  const [bulkGeneratingShows, setBulkGeneratingShows] = useState<StudioShow[] | null>(null);
  const [bulkAssigningShows, setBulkAssigningShows] = useState<StudioShow[] | null>(null);
  const [actualsShowId, setActualsShowId] = useState<string | null>(null);
  const { isRunning: isExporting, run: runExport } = useAbortableAction();

  const {
    data,
    shows,
    isLoading,
    isFetching,
    refetch,
    pagination,
    onPaginationChange,
    columnFilters,
    onColumnFiltersChange,
    sorting,
    onSortingChange,
    queryParams,
  } = useStudioShows({ studioId, dateFrom: scopeDateFrom, dateTo: scopeDateTo, needsAttention, attentionShowUids });

  const actualsShow = useMemo(() => {
    if (!actualsShowId) {
      return null;
    }

    return shows.find((show) => show.id === actualsShowId) ?? null;
  }, [actualsShowId, shows]);
  const tableColumns = useMemo(
    () => getStudioShowOperationsColumns({ onEditActuals: (show) => setActualsShowId(show.id) }),
    [],
  );

  const {
    rowSelection,
    selectedItems: selectedShows,
    onRowSelectionChange: handleRowSelectionChange,
    clearSelection: clearSelectedShows,
  } = useSelectedRowSnapshots(shows);

  const { data: showLookups } = useShowLookupsQuery(studioId);

  const searchableColumns = useMemo(
    () => [
      { id: 'name', title: 'Show Name', type: 'text' as const },
      {
        id: 'actuals_state',
        title: 'Actuals',
        type: 'select' as const,
        options: [
          { value: 'missing', label: 'Missing / incomplete' },
          { value: 'complete', label: 'Complete' },
        ],
      },
      {
        id: 'has_tasks',
        title: 'Tasks',
        type: 'select' as const,
        options: [
          { value: 'true', label: 'Has Tasks' },
          { value: 'false', label: 'No Tasks' },
        ],
      },
      {
        id: 'client_name',
        title: 'Client',
        type: 'text' as const,
      },
      {
        id: 'show_type_name',
        title: 'Show Type',
        type: 'select' as const,
        options: (showLookups?.show_types ?? []).map((o) => ({ value: o.name, label: o.name })),
      },
      {
        id: 'show_standard_name',
        title: 'Show Standard',
        type: 'select' as const,
        options: (showLookups?.show_standards ?? []).map((o) => ({ value: o.name, label: o.name })),
      },
      {
        id: 'show_status_name',
        title: 'Show Status',
        type: 'select' as const,
        options: (showLookups?.show_statuses ?? []).map((o) => ({ value: o.name, label: o.name })),
      },
      {
        id: 'platform_name',
        title: 'Platform',
        type: 'select' as const,
        options: (showLookups?.platforms ?? []).map((o) => ({ value: o.name, label: o.name })),
      },
    ],
    [showLookups],
  );
  const handleExport = useCallback(async (format: StudioShowExportFormat) => {
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

        const exportResult = buildStudioShowExportRows({
          shows: exportShows,
          formatDateTime,
        });
        triggerBrowserDownload({
          content: createStudioShowExportContent(exportResult, format),
          mimeType: format === 'json' ? 'application/json;charset=utf-8;' : 'text/csv;charset=utf-8;',
          filename: buildStudioShowExportFilename({
            format,
            dateFrom: queryParams.planning_date_from,
            dateTo: queryParams.planning_date_to,
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
        toast.error(error instanceof Error ? error.message : 'Failed to export shows. Please try again.');
      }
    });
  }, [queryParams, studioId, runExport]);

  return (
    <>
      <p className="text-xs text-muted-foreground">
        Showing shows in scope:
        {' '}
        {scopeLabel}
      </p>

      <DataTable
        data={shows}
        columns={tableColumns}
        isLoading={isLoading}
        isFetching={isFetching}
        emptyMessage="No shows found."
        manualPagination
        manualFiltering
        manualSorting
        pageCount={pagination.pageCount}
        paginationState={{
          pageIndex: pagination.pageIndex,
          pageSize: pagination.pageSize,
        }}
        onPaginationChange={adaptPaginationChange(pagination, onPaginationChange)}
        sorting={sorting}
        onSortingChange={adaptSortingChange(sorting, onSortingChange)}
        columnFilters={columnFilters}
        onColumnFiltersChange={adaptColumnFiltersChange(columnFilters, onColumnFiltersChange)}
        enableRowSelection
        rowSelection={rowSelection}
        onRowSelectionChange={handleRowSelectionChange}
        getRowId={(show) => show.id}
        renderToolbar={(table) => (
          <DataTableToolbar
            table={table}
            searchColumn="name"
            searchableColumns={searchableColumns}
            quickFilterColumns={QUICK_FILTER_COLUMNS}
            featuredFilterColumns={FEATURED_FILTER_COLUMNS}
            searchPlaceholder="Search shows..."
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9"
                  disabled={isExporting || ((data?.meta.total ?? shows.length) === 0)}
                  aria-busy={isExporting}
                >
                  {isExporting
                    ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    : <Download className="mr-2 h-4 w-4" />}
                  {isExporting ? 'Exporting…' : 'Export'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => void handleExport('csv')}
                  disabled={isExporting || ((data?.meta.total ?? shows.length) === 0)}
                >
                  Export CSV
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => void handleExport('json')}
                  disabled={isExporting || ((data?.meta.total ?? shows.length) === 0)}
                >
                  Export JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={`h-9 rounded-full px-3 gap-1.5 ${needsAttention ? 'border-amber-500 bg-amber-500 text-white hover:bg-amber-600 hover:text-white shadow-sm' : ''}`}
                  onClick={onToggleNeedsAttention}
                  aria-pressed={needsAttention}
                  aria-label={needsAttention ? 'Disable issues-only filter' : 'Enable issues-only filter'}
                >
                  <AlertTriangle className={`h-3.5 w-3.5 ${needsAttention ? '' : 'text-amber-600'}`} />
                  <span className="hidden sm:inline">Issues</span>
                  {needsAttention && <span className="hidden md:inline text-[10px] font-semibold">ON</span>}
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-64 text-xs">
                Show only items with task-readiness issues: no tasks, unassigned tasks, missing SETUP/CLOSURE tasks, or missing moderation on premium shows.
              </TooltipContent>
            </Tooltip>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={() => refetch()}
              disabled={isFetching}
              aria-label="Refresh shows list"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
          </DataTableToolbar>
        )}
        renderFooter={() => (
          <DataTablePagination
            pagination={pagination}
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
                onClick={() => setBulkGeneratingShows(selectedShows)}
              >
                <ListTodo className="mr-2 h-4 w-4" />
                Generate Tasks
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="rounded-full"
                onClick={() => setBulkAssigningShows(selectedShows)}
              >
                Assign Tasks
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
          <SelectedShowsMobileActions
            selectedCount={selectedShows.length}
            onGenerate={() => setBulkGeneratingShows(selectedShows)}
            onAssign={() => setBulkAssigningShows(selectedShows)}
            onClear={clearSelectedShows}
          />
        </>
      )}

      {bulkGeneratingShows && (
        <BulkTaskGenerationDialog
          open={bulkGeneratingShows.length > 0}
          onOpenChange={(open) => {
            if (!open)
              setBulkGeneratingShows(null);
          }}
          onSuccess={() => {
            void refetch();
            onShowsMutated();
          }}
          shows={bulkGeneratingShows}
        />
      )}

      {bulkAssigningShows && (
        <ShowAssignmentDialog
          studioId={studioId}
          open={bulkAssigningShows.length > 0}
          onOpenChange={(open) => {
            if (!open)
              setBulkAssigningShows(null);
          }}
          onSuccess={() => {
            void refetch();
            onShowsMutated();
          }}
          shows={bulkAssigningShows}
        />
      )}

      <ShowActualsDialog
        open={Boolean(actualsShowId)}
        onOpenChange={(open) => {
          if (!open) {
            setActualsShowId(null);
          }
        }}
        studioId={studioId}
        show={actualsShow}
        onSaved={() => {
          void refetch();
          onShowsMutated();
        }}
      />
    </>
  );
}
