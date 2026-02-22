import { createFileRoute } from '@tanstack/react-router';
import type { RowSelectionState } from '@tanstack/react-table';
import { ListTodo } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Button } from '@eridu/ui';

import { AdminTable } from '@/features/admin/components/admin-table';
import { BulkTaskGenerationDialog } from '@/features/shows/components/bulk-task-generation-dialog';
import { ShowAssignmentDialog } from '@/features/shows/components/show-assignment-dialog';
import type { StudioShow } from '@/features/studio-shows/api/get-studio-shows';
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

  // Convert rowSelection keys (which are indexes in current page) to actual `StudioShow` objects if needed,
  // or we can map them on the fly. Since rowSelection is index-based in Tanstack Table by default (unless getRowId is provided),
  // we extract the selected objects from the current page.
  const selectedShows = useMemo(() => {
    return Object.keys(rowSelection)
      .filter((k) => rowSelection[k])
      .map((k) => shows[Number.parseInt(k, 10)])
      .filter(Boolean);
  }, [rowSelection, shows]);

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
        searchableColumns={[{ id: 'name', title: 'Show Name' }]}
        searchPlaceholder="Search shows..."

        // Selection
        enableRowSelection
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}

        // Extra toolbar actions
        renderToolbarActions={() => (
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            Refresh
          </Button>
        )}
      />

      {/* Floating Action Bar */}
      {selectedShows.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center justify-between gap-4 rounded-full bg-slate-900 px-6 py-3 text-slate-50 shadow-lg dark:bg-slate-50 dark:text-slate-900 border animate-in slide-in-from-bottom-5">
          <div className="flex items-center gap-2 pr-4 border-r border-slate-700 dark:border-slate-300">
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
              <ListTodo className="h-4 w-4 mr-2" />
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
              className="rounded-full hover:bg-slate-800 hover:text-white dark:hover:bg-slate-200 dark:hover:text-black ml-2"
              onClick={() => setRowSelection({})}
            >
              Cancel
            </Button>
          </div>
        </div>
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
