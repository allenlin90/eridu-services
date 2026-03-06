import { createFileRoute } from '@tanstack/react-router';
import type { OnChangeFn, RowSelectionState } from '@tanstack/react-table';
import { AlertTriangle, ListTodo, RefreshCw } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import type { DateRange } from 'react-day-picker';

import { STUDIO_ROLE } from '@eridu/api-types/memberships';
import {
  adaptColumnFiltersChange,
  adaptPaginationChange,
  adaptSortingChange,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DataTable,
  DataTablePagination,
  DataTableToolbar,
  DatePickerWithRange,
} from '@eridu/ui';

import { BulkTaskGenerationDialog } from '@/features/shows/components/bulk-task-generation-dialog';
import { usePlatformsFieldData } from '@/features/shows/components/hooks/use-platforms-field-data';
import { useShowStandardFieldData } from '@/features/shows/components/hooks/use-show-standard-field-data';
import { useShowStatusFieldData } from '@/features/shows/components/hooks/use-show-status-field-data';
import { useShowTypeFieldData } from '@/features/shows/components/hooks/use-show-type-field-data';
import { ShowAssignmentDialog } from '@/features/shows/components/show-assignment-dialog';
import { useShiftAlignment } from '@/features/studio-shifts/hooks/use-studio-shifts';
import { toLocalDateInputValue } from '@/features/studio-shifts/utils/shift-form.utils';
import type { StudioShow } from '@/features/studio-shows/api/get-studio-shows';
import { SelectedShowsMobileActions } from '@/features/studio-shows/components/selected-shows-mobile-actions';
import { columns } from '@/features/studio-shows/components/studio-shows-table/columns';
import { useStudioShows } from '@/features/studio-shows/hooks/use-studio-shows';
import { useUserProfile } from '@/lib/hooks/use-user';

export const Route = createFileRoute('/studios/$studioId/shows/')({
  component: StudioShowsPage,
});

function addDays(base: Date, days: number): Date {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

function getDefaultPlanningRange() {
  const start = new Date();
  const end = addDays(start, 7);
  return {
    from: toLocalDateInputValue(start),
    to: toLocalDateInputValue(end),
  };
}

function resolveUpdater<T>(updater: T | ((previous: T) => T), previous: T): T {
  return typeof updater === 'function'
    ? (updater as (current: T) => T)(previous)
    : updater;
}

const QUICK_FILTER_COLUMNS = ['start_time'];
const FEATURED_FILTER_COLUMNS = ['has_tasks', 'client_name', 'show_status_name'];

function StudioShowsPage() {
  const { studioId } = Route.useParams();
  const { data: profile } = useUserProfile();
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [planningDateFrom, setPlanningDateFrom] = useState(() => getDefaultPlanningRange().from);
  const [planningDateTo, setPlanningDateTo] = useState(() => getDefaultPlanningRange().to);

  const [bulkGeneratingShows, setBulkGeneratingShows] = useState<StudioShow[] | null>(null);
  const [bulkAssigningShows, setBulkAssigningShows] = useState<StudioShow[] | null>(null);
  const activeMembership = useMemo(
    () => profile?.studio_memberships?.find((membership) => membership.studio.uid === studioId),
    [profile?.studio_memberships, studioId],
  );
  const isStudioAdmin = activeMembership?.role === STUDIO_ROLE.ADMIN;

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

  const handleRowSelectionChange = useCallback<OnChangeFn<RowSelectionState>>(
    (updater) => {
      const nextSelection = resolveUpdater(updater, rowSelection);
      const selectedIds = new Set(
        Object.entries(nextSelection)
          .filter(([, isSelected]) => isSelected)
          .map(([id]) => id),
      );

      setRowSelection(nextSelection);
      setSelectedShowSnapshots((previousSnapshots) => {
        const nextSnapshots: Record<string, StudioShow> = {};
        selectedIds.forEach((id) => {
          const show = showsById[id] ?? previousSnapshots[id];
          if (show) {
            nextSnapshots[id] = show;
          }
        });

        const previousKeys = Object.keys(previousSnapshots);
        const nextKeys = Object.keys(nextSnapshots);
        const hasSameStructure = previousKeys.length === nextKeys.length
          && nextKeys.every((id) => previousSnapshots[id] === nextSnapshots[id]);
        return hasSameStructure ? previousSnapshots : nextSnapshots;
      });
    },
    [rowSelection, showsById],
  );
  const clearSelectedShows = useCallback(() => {
    setRowSelection({});
    setSelectedShowSnapshots({});
  }, []);

  const selectedShows = useMemo(() => {
    return selectedShowIds
      .map((id) => showsById[id] ?? selectedShowSnapshots[id] ?? null)
      .filter((show): show is StudioShow => show !== null);
  }, [selectedShowIds, selectedShowSnapshots, showsById]);

  // Fetch filter options
  const { options: typeOptions } = useShowTypeFieldData(null, studioId);
  const { options: standardOptions } = useShowStandardFieldData(null, studioId);
  const { options: statusOptions } = useShowStatusFieldData(null, studioId);
  const { options: platformOptions } = usePlatformsFieldData(null, studioId);

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
        type: 'text' as const,
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
    [typeOptions, standardOptions, statusOptions, platformOptions],
  );

  const planningDateRange: DateRange | undefined = planningDateFrom || planningDateTo
    ? {
        from: planningDateFrom ? new Date(`${planningDateFrom}T00:00:00`) : undefined,
        to: planningDateTo ? new Date(`${planningDateTo}T00:00:00`) : undefined,
      }
    : undefined;
  const hasInvalidPlanningRange = planningDateFrom > planningDateTo;
  const {
    data: shiftAlignmentResponse,
    isLoading: isLoadingShiftAlignment,
    isFetching: isFetchingShiftAlignment,
    refetch: refetchShiftAlignment,
  } = useShiftAlignment(
    studioId,
    {
      date_from: planningDateFrom,
      date_to: planningDateTo,
      include_cancelled: false,
    },
    {
      enabled: isStudioAdmin && !hasInvalidPlanningRange,
    },
  );
  const taskReadinessWarningCount = shiftAlignmentResponse?.task_readiness_warnings.length ?? 0;
  const showsMissingRequiredTaskTypes = shiftAlignmentResponse?.task_readiness_warnings
    .filter((warning) => !warning.has_no_tasks && warning.missing_required_task_types.length > 0)
    .length ?? 0;

  const handleResetPlanningRange = () => {
    const nextRange = getDefaultPlanningRange();
    setPlanningDateFrom(nextRange.from);
    setPlanningDateTo(nextRange.to);
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Shows</h1>
        <p className="text-muted-foreground">
          Monitor task progress and assignments across all your studio shows.
        </p>
      </div>

      {isStudioAdmin && (
        <Card>
          <CardHeader className="gap-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-1">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  Show Task Readiness Warnings
                </CardTitle>
                <CardDescription>
                  Summary for upcoming shows by date range.
                </CardDescription>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <DatePickerWithRange
                  date={planningDateRange}
                  setDate={(range) => {
                    setPlanningDateFrom(range?.from ? toLocalDateInputValue(range.from) : '');
                    setPlanningDateTo(range?.to ? toLocalDateInputValue(range.to) : '');
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetPlanningRange}
                  disabled={isFetchingShiftAlignment}
                >
                  Next 7 Days
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => void refetchShiftAlignment()}
                  disabled={isFetchingShiftAlignment || hasInvalidPlanningRange}
                  aria-label="Refresh task readiness warnings"
                >
                  <RefreshCw className={`h-4 w-4 ${isFetchingShiftAlignment ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
            {hasInvalidPlanningRange && (
              <p className="text-sm text-destructive">Planning end date must be on or after start date.</p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {(isLoadingShiftAlignment || isFetchingShiftAlignment)
              ? (
                  <p className="text-sm text-muted-foreground">Checking show task readiness...</p>
                )
              : (
                  <div className="space-y-3">
                    <div className="rounded-md border p-3">
                      <p className="text-xs text-muted-foreground">Shows With Task Readiness Risks</p>
                      <p className="text-xl font-semibold">{taskReadinessWarningCount}</p>
                    </div>
                    <div className="rounded-md border p-3 space-y-1">
                      <p className="text-sm font-medium">Task Readiness</p>
                      <p className="text-sm text-muted-foreground">
                        Shows without tasks:
                        {' '}
                        <span className="font-medium text-foreground">{shiftAlignmentResponse?.summary.shows_without_tasks_count ?? 0}</span>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Shows with unassigned tasks:
                        {' '}
                        <span className="font-medium text-foreground">{shiftAlignmentResponse?.summary.shows_with_unassigned_tasks_count ?? 0}</span>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Unassigned tasks:
                        {' '}
                        <span className="font-medium text-foreground">{shiftAlignmentResponse?.summary.tasks_unassigned_count ?? 0}</span>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Shows missing SETUP/ACTIVE/CLOSURE:
                        {' '}
                        <span className="font-medium text-foreground">{showsMissingRequiredTaskTypes}</span>
                        {' '}
                        <span className="text-xs">
                          (excluding shows with no tasks)
                        </span>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Premium shows missing moderation:
                        {' '}
                        <span className="font-medium text-foreground">{shiftAlignmentResponse?.summary.premium_shows_missing_moderation_count ?? 0}</span>
                      </p>
                    </div>
                  </div>
                )}
          </CardContent>
        </Card>
      )}

      {/* Data Table */}
      <DataTable
        data={shows}
        columns={columns}
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
            searchableColumns={searchableColumns}
            quickFilterColumns={QUICK_FILTER_COLUMNS}
            featuredFilterColumns={FEATURED_FILTER_COLUMNS}
            searchPlaceholder="Search shows..."
          >
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              Refresh
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
