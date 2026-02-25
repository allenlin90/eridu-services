import { createFileRoute } from '@tanstack/react-router';
import type { RowSelectionState } from '@tanstack/react-table';
import { ListTodo } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { Button } from '@eridu/ui';

import { AdminTable } from '@/features/admin/components/admin-table';
import { BulkTaskGenerationDialog } from '@/features/shows/components/bulk-task-generation-dialog';
import { useClientFieldData } from '@/features/shows/components/hooks/use-client-field-data';
import { usePlatformsFieldData } from '@/features/shows/components/hooks/use-platforms-field-data';
import { useShowStandardFieldData } from '@/features/shows/components/hooks/use-show-standard-field-data';
import { useShowStatusFieldData } from '@/features/shows/components/hooks/use-show-status-field-data';
import { useShowTypeFieldData } from '@/features/shows/components/hooks/use-show-type-field-data';
import { ShowAssignmentDialog } from '@/features/shows/components/show-assignment-dialog';
import type { StudioShow } from '@/features/studio-shows/api/get-studio-shows';
import { SelectedShowsMobileActions } from '@/features/studio-shows/components/selected-shows-mobile-actions';
import { columns } from '@/features/studio-shows/components/studio-shows-table/columns';
import { useStudioShows } from '@/features/studio-shows/hooks/use-studio-shows';

export const Route = createFileRoute('/studios/$studioId/shows/')({
  component: StudioShowsPage,
});

function StudioShowsPage() {
  const { studioId } = Route.useParams();
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const [bulkGeneratingShows, setBulkGeneratingShows] = useState<StudioShow[] | null>(null);
  const [bulkAssigningShows, setBulkAssigningShows] = useState<StudioShow[] | null>(null);

  const {
    shows,
    total,
    isLoading,
    isFetching,
    refetch,
    pagination,
    onPaginationChange,
    columnFilters,
    onColumnFiltersChange,
    sorting,
    onSortingChange,
  } = useStudioShows({ studioId });

  // Keep lightweight snapshots for selected rows that are not on current page.
  const [selectedShowSnapshots, setSelectedShowSnapshots] = useState<Record<string, StudioShow>>({});
  const selectedShowIds = useMemo(
    () => Object.entries(rowSelection).filter(([, isSelected]) => isSelected).map(([id]) => id),
    [rowSelection],
  );
  const showsById = useMemo(
    () => Object.fromEntries(shows.map((show) => [show.id, show])),
    [shows],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedShowSnapshots((prev) => {
      const selectedIds = new Set(selectedShowIds);
      const next: Record<string, StudioShow> = {};

      Object.entries(prev).forEach(([id, show]) => {
        if (selectedIds.has(id)) {
          next[id] = show;
        }
      });

      selectedShowIds.forEach((id) => {
        const latestShow = showsById[id];
        if (latestShow) {
          next[id] = latestShow;
        }
      });

      const prevKeys = Object.keys(prev);
      const nextKeys = Object.keys(next);
      const hasSameStructure = prevKeys.length === nextKeys.length
        && nextKeys.every((id) => prev[id] === next[id]);

      return hasSameStructure ? prev : next;
    });
  }, [selectedShowIds, showsById]);

  const selectedShows = useMemo(() => {
    return selectedShowIds
      .map((id) => showsById[id] ?? selectedShowSnapshots[id] ?? null)
      .filter((show): show is StudioShow => show !== null);
  }, [selectedShowIds, selectedShowSnapshots, showsById]);

  // Fetch filter options
  const { options: clientOptions } = useClientFieldData(null);
  const { options: typeOptions } = useShowTypeFieldData(null);
  const { options: standardOptions } = useShowStandardFieldData(null);
  const { options: statusOptions } = useShowStatusFieldData(null);
  const { options: platformOptions } = usePlatformsFieldData(null);

  const searchableColumns = useMemo(
    () => [
      { id: 'name', title: 'Show Name', type: 'text' as const },
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
        type: 'select' as const,
        options: clientOptions.map((o) => ({ value: o.label, label: o.label })),
      },
      {
        id: 'show_type_name',
        title: 'Show Type',
        type: 'select' as const,
        options: typeOptions.map((o) => ({ value: o.label, label: o.label })),
      },
      {
        id: 'show_standard_name',
        title: 'Show Standard',
        type: 'select' as const,
        options: standardOptions.map((o) => ({ value: o.label, label: o.label })),
      },
      {
        id: 'show_status_name',
        title: 'Show Status',
        type: 'select' as const,
        options: statusOptions.map((o) => ({ value: o.label, label: o.label })),
      },
      {
        id: 'platform_name',
        title: 'Platform',
        type: 'select' as const,
        options: platformOptions.map((o) => ({ value: o.label, label: o.label })),
      },
      { id: 'start_time', title: 'Date', type: 'date-range' as const },
    ],
    [clientOptions, typeOptions, standardOptions, statusOptions, platformOptions],
  );

  const quickFilterColumns = useMemo(() => ['start_time'], []);
  const featuredFilterColumns = useMemo(() => ['has_tasks', 'client_name', 'show_status_name'], []);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Shows</h1>
        <p className="text-muted-foreground">
          Monitor task progress and assignments across all your studio shows.
        </p>
      </div>

      {/* Data Table */}
      <AdminTable
        data={shows}
        columns={columns}
        isLoading={isLoading}
        isFetching={isFetching}
        emptyMessage="No shows found."

        // Pagination
        pagination={{
          pageIndex: pagination.pageIndex,
          pageSize: pagination.pageSize,
          total,
          pageCount: Math.ceil(total / pagination.pageSize),
        }}
        onPaginationChange={onPaginationChange}

        // Sorting & Filtering
        sorting={sorting}
        onSortingChange={onSortingChange}
        columnFilters={columnFilters}
        onColumnFiltersChange={onColumnFiltersChange}
        searchColumn="name"
        searchableColumns={searchableColumns}
        quickFilterColumns={quickFilterColumns}
        featuredFilterColumns={featuredFilterColumns}
        searchPlaceholder="Search shows..."

        // Selection
        enableRowSelection
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        getRowId={(show) => show.id}

        // Extra toolbar actions
        renderToolbarActions={() => (
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            Refresh
          </Button>
        )}
      />

      {/* Floating Action Bar */}
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
                onClick={() => setRowSelection({})}
              >
                Cancel
              </Button>
            </div>
          </div>
          <SelectedShowsMobileActions
            selectedCount={selectedShows.length}
            onGenerate={() => setBulkGeneratingShows(selectedShows)}
            onAssign={() => setBulkAssigningShows(selectedShows)}
            onClear={() => setRowSelection({})}
          />
        </>
      )}

      {/* Dialogs */}
      {bulkGeneratingShows && (
        <BulkTaskGenerationDialog
          open={bulkGeneratingShows.length > 0}
          onOpenChange={(open) => {
            if (!open)
              setBulkGeneratingShows(null);
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
          shows={bulkAssigningShows}
        />
      )}
    </div>
  );
}
