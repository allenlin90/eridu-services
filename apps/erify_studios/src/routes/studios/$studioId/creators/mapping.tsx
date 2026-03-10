import { createFileRoute, Link } from '@tanstack/react-router';
import type { ColumnDef, OnChangeFn, RowSelectionState } from '@tanstack/react-table';
import { RefreshCw, Users } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

import {
  adaptColumnFiltersChange,
  adaptPaginationChange,
  adaptSortingChange,
  Badge,
  Button,
  Checkbox,
  DataTable,
  DataTablePagination,
  DataTableToolbar,
} from '@eridu/ui';

import { StudioRouteGuard } from '@/components/guards/studio-route-guard';
import { PageLayout } from '@/components/layouts/page-layout';
import { BulkCreatorAssignDialog } from '@/features/studio-show-creators/components/bulk-creator-assign-dialog';
import type { StudioShow } from '@/features/studio-shows/api/get-studio-shows';
import { useStudioShows } from '@/features/studio-shows/hooks/use-studio-shows';

export const Route = createFileRoute('/studios/$studioId/creators/mapping')({
  component: StudioCreatorsMappingPage,
});

function createCreatorsColumns(studioId: string): ColumnDef<StudioShow>[] {
  return [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || table.getIsSomePageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all shows"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select show"
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 40,
    },
    {
      accessorKey: 'name',
      header: 'Show',
    },
    {
      accessorKey: 'client_name',
      header: 'Client',
      cell: ({ row }) => row.original.client_name || '—',
    },
    {
      accessorKey: 'start_time',
      header: 'Start Time',
      cell: ({ row }) => new Date(row.original.start_time).toLocaleString(),
    },
    {
      id: 'creators',
      header: 'Creators',
      cell: ({ row }) => {
        const names = row.original.creators
          .map((creator) => creator.creator_alias_name || creator.creator_name)
          .filter(Boolean);
        if (names.length === 0) {
          return <span className="text-muted-foreground">—</span>;
        }

        const displayNames = names.slice(0, 2);
        const remainingCount = names.length - 2;

        return (
          <div className="flex flex-wrap gap-1">
            {displayNames.map((name, index) => (
              <Badge key={index} variant="secondary" className="font-normal truncate max-w-[120px]" title={name}>
                {name}
              </Badge>
            ))}
            {remainingCount > 0 && (
              <Badge variant="outline" className="font-normal" title={names.slice(2).join(', ')}>
                +
                {remainingCount}
                {' '}
                more
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      id: 'mapping',
      header: 'Creator Mapping',
      cell: ({ row }) => (
        <Button asChild variant="outline" size="sm">
          <Link
            to="/studios/$studioId/shows/$showId/creators"
            params={{ studioId, showId: row.original.id }}
            search={{ from: 'creators', page: 1, pageSize: 10 }}
          >
            Manage
          </Link>
        </Button>
      ),
    },
  ];
}

function resolveUpdater<T>(updater: T | ((previous: T) => T), previous: T): T {
  return typeof updater === 'function'
    ? (updater as (current: T) => T)(previous)
    : updater;
}

function StudioCreatorsMappingPage() {
  const { studioId } = Route.useParams();
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
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
  } = useStudioShows({ studioId, routeFrom: '/studios/$studioId/creators/mapping' });

  const selectedShowIds = useMemo(
    () => Object.entries(rowSelection).filter(([, selected]) => selected).map(([id]) => id),
    [rowSelection],
  );
  const creatorsColumns = useMemo(() => createCreatorsColumns(studioId), [studioId]);
  const showsById = useMemo(() => {
    const map: Record<string, StudioShow> = {};
    shows.forEach((show) => {
      map[show.id] = show;
    });
    return map;
  }, [shows]);
  const [selectedShowSnapshots, setSelectedShowSnapshots] = useState<Record<string, StudioShow>>({});
  const selectedShows = useMemo(
    () => selectedShowIds
      .map((id) => showsById[id] ?? selectedShowSnapshots[id] ?? null)
      .filter((show): show is StudioShow => show !== null),
    [selectedShowIds, selectedShowSnapshots, showsById],
  );

  const handleRowSelectionChange = useCallback<OnChangeFn<RowSelectionState>>(
    (updater) => {
      const nextSelection = resolveUpdater(updater, rowSelection);
      const selectedIds = new Set(
        Object.entries(nextSelection)
          .filter(([, isSelected]) => isSelected)
          .map(([id]) => id),
      );

      setRowSelection(nextSelection);
      setSelectedShowSnapshots((previous) => {
        const next: Record<string, StudioShow> = {};
        selectedIds.forEach((id) => {
          const candidate = showsById[id] ?? previous[id];
          if (candidate)
            next[id] = candidate;
        });
        return next;
      });
    },
    [rowSelection, showsById],
  );
  const clearSelectedShows = useCallback(() => {
    setRowSelection({});
    setSelectedShowSnapshots({});
  }, []);

  return (
    <StudioRouteGuard
      studioId={studioId}
      routeKey="creators"
      deniedTitle="Creator Access Required"
      deniedDescription="Only studio admins, managers, and talent managers can map creators."
    >
      <PageLayout
        title="Creator Mapping"
        description="Map creators to shows without entering task generation/review workflows."
      >
        <div className="space-y-4">
          <DataTable
            data={shows}
            columns={creatorsColumns}
            isLoading={isLoading}
            isFetching={isFetching}
            emptyMessage="No shows found."
            manualPagination
            manualFiltering
            manualSorting
            pageCount={Math.ceil(total / pagination.pageSize)}
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
                searchPlaceholder="Search shows..."
              >
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => refetch()}
                  disabled={isFetching}
                  aria-label="Refresh creators mapping list"
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
                  pageCount: Math.ceil(total / pagination.pageSize),
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
                    onClick={() => setBulkAssigningShows(selectedShows)}
                  >
                    <Users className="mr-2 h-4 w-4" />
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
              <div className="fixed inset-x-4 bottom-4 z-50 rounded-2xl border bg-background/95 p-3 shadow-lg backdrop-blur md:hidden">
                <div className="mb-2 text-sm font-medium">
                  {selectedShows.length}
                  {' '}
                  selected
                </div>
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    size="sm"
                    onClick={() => setBulkAssigningShows(selectedShows)}
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Assign Creators
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearSelectedShows}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </>
          )}

          {bulkAssigningShows && (
            <BulkCreatorAssignDialog
              studioId={studioId}
              open={bulkAssigningShows.length > 0}
              defaultMode="replace"
              onOpenChange={(open) => {
                if (!open)
                  setBulkAssigningShows(null);
              }}
              selectedShows={bulkAssigningShows}
              onSuccess={() => {
                void refetch();
                setBulkAssigningShows(null);
                clearSelectedShows();
              }}
            />
          )}
        </div>
      </PageLayout>
    </StudioRouteGuard>
  );
}
