import { useQuery } from '@tanstack/react-query';
import { createFileRoute, getRouteApi } from '@tanstack/react-router';
import type { OnChangeFn, RowSelectionState } from '@tanstack/react-table';
import { AlertTriangle, ChevronDown, ChevronUp, Info, ListTodo, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DateRange } from 'react-day-picker';

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
  Skeleton,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@eridu/ui';

import { PageLayout } from '@/components/layouts/page-layout';
import { useShowLookupsQuery } from '@/features/shows/api/get-show-lookups';
import { BulkTaskGenerationDialog } from '@/features/shows/components/bulk-task-generation-dialog';
import { ShowAssignmentDialog } from '@/features/shows/components/show-assignment-dialog';
import { useShiftAlignment } from '@/features/studio-shifts/hooks/use-studio-shifts';
import { addDays } from '@/features/studio-shifts/utils/shift-date.utils';
import { toLocalDateInputValue } from '@/features/studio-shifts/utils/shift-form.utils';
import { getStudioShows, type StudioShow } from '@/features/studio-shows/api/get-studio-shows';
import { SelectedShowsMobileActions } from '@/features/studio-shows/components/selected-shows-mobile-actions';
import { columns } from '@/features/studio-shows/components/studio-shows-table/columns';
import { useStudioShows } from '@/features/studio-shows/hooks/use-studio-shows';
import {
  normalizeScopeDate,
  parseScopeDateAsLocal,
  toShowScopeDateTimeBounds,
} from '@/features/studio-shows/utils/show-scope.utils';

export const Route = createFileRoute('/studios/$studioId/shows/')({
  component: StudioShowsPage,
});
const showsRouteApi = getRouteApi('/studios/$studioId/shows');

type ScopeRange = {
  date_from?: string;
  date_to?: string;
};

function getDefaultPlanningRange() {
  const start = new Date();
  const end = addDays(start, 7);
  return {
    date_from: toLocalDateInputValue(start),
    date_to: toLocalDateInputValue(end),
  };
}

function resolveUpdater<T>(updater: T | ((previous: T) => T), previous: T): T {
  return typeof updater === 'function'
    ? (updater as (current: T) => T)(previous)
    : updater;
}

function parseSearchDate(raw?: string): Date | undefined {
  return parseScopeDateAsLocal(raw);
}

function toApiDate(raw?: string): string | undefined {
  return normalizeScopeDate(raw);
}

function buildScopeRange(range: DateRange | undefined): ScopeRange {
  const fromDate = range?.from ?? range?.to;
  const toDate = range?.to ?? range?.from;

  if (!fromDate || !toDate) {
    return {
      date_from: undefined,
      date_to: undefined,
    };
  }

  return {
    date_from: toLocalDateInputValue(fromDate),
    date_to: toLocalDateInputValue(toDate),
  };
}

function formatScopeLabel(dateFrom?: string, dateTo?: string): string {
  const from = toApiDate(dateFrom);
  const to = toApiDate(dateTo);

  if (!from || !to) {
    return 'No date scope selected';
  }

  return `${from} to ${to}`;
}

const QUICK_FILTER_COLUMNS: string[] = [];
const FEATURED_FILTER_COLUMNS = ['has_tasks', 'client_name', 'show_status_name'];

function StudioShowsPage() {
  const { studioId } = showsRouteApi.useParams();
  const search = showsRouteApi.useSearch();
  const navigate = showsRouteApi.useNavigate();
  const isNeedsAttentionActive = search.needs_attention === true || search.needs_attention === 'true';
  const [isReadinessSnapshotVisible, setIsReadinessSnapshotVisible] = useState(true);
  const [snapshotRefreshSignal, setSnapshotRefreshSignal] = useState(0);
  const [defaultScopeRange] = useState(() => {
    return getDefaultPlanningRange();
  });

  const updateSearch = useCallback((
    updater: (previous: typeof search) => typeof search,
    options?: { replace?: boolean },
  ) => {
    void navigate({
      to: '/studios/$studioId/shows',
      params: { studioId },
      search: updater,
      replace: options?.replace ?? true,
    });
  }, [navigate, studioId]);

  useEffect(() => {
    if (search.date_from && search.date_to) {
      return;
    }

    updateSearch((previous) => ({
      ...previous,
      page: 1,
      date_from: previous.date_from ?? defaultScopeRange.date_from,
      date_to: previous.date_to ?? defaultScopeRange.date_to,
    }), { replace: true });
  }, [defaultScopeRange.date_from, defaultScopeRange.date_to, search.date_from, search.date_to, updateSearch]);

  const scopeDateRange = useMemo<DateRange | undefined>(() => {
    if (!search.date_from && !search.date_to) {
      return undefined;
    }

    return {
      from: parseSearchDate(search.date_from),
      to: parseSearchDate(search.date_to),
    };
  }, [search.date_from, search.date_to]);
  const [isScopeDatePickerOpen, setIsScopeDatePickerOpen] = useState(false);
  const [draftScopeDateRange, setDraftScopeDateRange] = useState<DateRange | undefined>(scopeDateRange);
  const pickerScopeDateRange = isScopeDatePickerOpen ? draftScopeDateRange : scopeDateRange;

  const handleScopeDatePickerOpenChange = useCallback((open: boolean) => {
    if (open) {
      setDraftScopeDateRange(scopeDateRange);
      setIsScopeDatePickerOpen(true);
      return;
    }

    setIsScopeDatePickerOpen(false);
    const nextScope = buildScopeRange(draftScopeDateRange);
    updateSearch((previous) => ({
      ...previous,
      page: 1,
      date_from: nextScope.date_from,
      date_to: nextScope.date_to,
    }));
  }, [draftScopeDateRange, scopeDateRange, updateSearch]);

  const handleResetScope = useCallback(() => {
    updateSearch((previous) => ({
      ...previous,
      page: 1,
      date_from: defaultScopeRange.date_from,
      date_to: defaultScopeRange.date_to,
    }));
  }, [defaultScopeRange.date_from, defaultScopeRange.date_to, updateSearch]);
  const triggerSnapshotRefresh = useCallback(() => {
    setSnapshotRefreshSignal((previous) => previous + 1);
  }, []);

  return (
    <PageLayout
      title="Shows"
      description="Monitor task progress and assignments across all your studio shows."
    >
      <div className="space-y-4">
        <Card>
          <CardHeader className="gap-3">
            <div className="space-y-1">
              <CardTitle className="text-base">Scope</CardTitle>
              <CardDescription>
                This date range applies to both readiness summary and show list.
              </CardDescription>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <DatePickerWithRange
                  date={pickerScopeDateRange}
                  setDate={setDraftScopeDateRange}
                  open={isScopeDatePickerOpen}
                  onOpenChange={handleScopeDatePickerOpenChange}
                />
                <Button variant="outline" size="sm" onClick={handleResetScope}>
                  Next 7 Days
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        <ShowTaskReadinessSection
          studioId={studioId}
          scopeDateFrom={search.date_from}
          scopeDateTo={search.date_to}
          refreshSignal={snapshotRefreshSignal}
          isVisible={isReadinessSnapshotVisible}
          onToggleVisibility={() => setIsReadinessSnapshotVisible((previous) => !previous)}
        />

        <StudioShowsTableSection
          studioId={studioId}
          scopeDateFrom={search.date_from}
          scopeDateTo={search.date_to}
          scopeLabel={formatScopeLabel(search.date_from, search.date_to)}
          needsAttention={isNeedsAttentionActive}
          onShowsMutated={triggerSnapshotRefresh}
          onToggleNeedsAttention={() => {
            updateSearch((previous) => ({
              ...previous,
              page: 1,
              needs_attention: isNeedsAttentionActive ? undefined : true,
            }));
          }}
        />
      </div>
    </PageLayout>
  );
}

function ShowTaskReadinessSection({
  studioId,
  scopeDateFrom,
  scopeDateTo,
  refreshSignal,
  isVisible,
  onToggleVisibility,
}: {
  studioId: string;
  scopeDateFrom?: string;
  scopeDateTo?: string;
  refreshSignal: number;
  isVisible: boolean;
  onToggleVisibility: () => void;
}) {
  const planningDateFrom = toApiDate(scopeDateFrom);
  const planningDateTo = toApiDate(scopeDateTo);
  const hasIncompletePlanningRange = !planningDateFrom || !planningDateTo;
  const hasInvalidPlanningRange = !hasIncompletePlanningRange && planningDateFrom > planningDateTo;
  const showScopeDateBounds = useMemo(
    () => toShowScopeDateTimeBounds({ dateFrom: planningDateFrom, dateTo: planningDateTo }),
    [planningDateFrom, planningDateTo],
  );
  const alignmentQueryParams = useMemo(() => ({
    ...(showScopeDateBounds.date_from ? { date_from: showScopeDateBounds.date_from } : {}),
    ...(showScopeDateBounds.date_to ? { date_to: showScopeDateBounds.date_to } : {}),
    include_cancelled: false,
    include_past: true,
  }), [showScopeDateBounds.date_from, showScopeDateBounds.date_to]);

  const {
    data: shiftAlignmentResponse,
    isLoading: isLoadingShiftAlignment,
    isFetching: isFetchingShiftAlignment,
    refetch: refetchShiftAlignment,
  } = useShiftAlignment(
    studioId,
    alignmentQueryParams,
    {
      enabled: !hasIncompletePlanningRange && !hasInvalidPlanningRange,
    },
  );

  const {
    data: showsScopeResponse,
    isLoading: isLoadingShowsScope,
    isFetching: isFetchingShowsScope,
    refetch: refetchShowsScope,
  } = useQuery({
    queryKey: ['studio-shows', 'scope-total', studioId, showScopeDateBounds.date_from, showScopeDateBounds.date_to, refreshSignal],
    queryFn: () =>
      getStudioShows(studioId, {
        page: 1,
        limit: 1,
        date_from: showScopeDateBounds.date_from,
        date_to: showScopeDateBounds.date_to,
      }),
    enabled: !hasIncompletePlanningRange && !hasInvalidPlanningRange,
  });
  useEffect(() => {
    if (hasIncompletePlanningRange || hasInvalidPlanningRange) {
      return;
    }
    void Promise.all([refetchShiftAlignment(), refetchShowsScope()]);
  }, [hasIncompletePlanningRange, hasInvalidPlanningRange, refreshSignal, refetchShiftAlignment, refetchShowsScope]);

  const isLoadingSnapshot = isLoadingShiftAlignment || isLoadingShowsScope;
  const isFetchingSnapshot = isFetchingShiftAlignment || isFetchingShowsScope;
  const showsInScopeCount = showsScopeResponse?.meta.total ?? 0;
  const taskReadinessWarnings = shiftAlignmentResponse?.task_readiness_warnings ?? [];
  const showsWithIssuesCount = taskReadinessWarnings.length;
  const showsWithoutTasksCount = taskReadinessWarnings.filter((warning) => warning.has_no_tasks).length;
  const showsWithUnassignedTasksCount = taskReadinessWarnings.filter((warning) => warning.unassigned_task_count > 0).length;
  const unassignedTasksCount = taskReadinessWarnings.reduce((total, warning) => total + warning.unassigned_task_count, 0);
  const showsMissingRequiredTypesCount = taskReadinessWarnings.filter((warning) =>
    !warning.has_no_tasks && warning.missing_required_task_types.length > 0).length;
  const readinessMetrics = [
    {
      label: 'Shows In Scope',
      value: showsInScopeCount,
      tooltip: 'All shows currently included by the selected date range. Use this to confirm list coverage.',
    },
    {
      label: 'Shows With Issues',
      value: showsWithIssuesCount,
      tooltip: 'Shows that match Issues filter criteria (no tasks, unassigned tasks, or missing required task types).',
    },
    {
      label: 'Without Tasks',
      value: showsWithoutTasksCount,
      tooltip: 'Shows that have no tasks at all. Use this to spot planning gaps before execution.',
    },
    {
      label: 'Unassigned Shows',
      value: showsWithUnassignedTasksCount,
      tooltip: 'Shows that contain one or more unassigned tasks. Use this to prioritize assignment actions.',
    },
    {
      label: 'Unassigned Tasks',
      value: unassignedTasksCount,
      tooltip: 'Total number of tasks without an assignee across in-scope shows. Use this to estimate assignment workload.',
    },
    {
      label: 'Missing Required Types',
      value: showsMissingRequiredTypesCount,
      tooltip: 'Shows that already have tasks but are missing required baseline types (SETUP, CLOSURE). Premium shows also need moderation coverage.',
    },
  ];

  return (
    <Card>
      <CardHeader className="relative gap-3 pr-24">
        <div className="absolute right-4 top-4 flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              void Promise.all([refetchShiftAlignment(), refetchShowsScope()]);
            }}
            disabled={!isVisible || isFetchingSnapshot || hasIncompletePlanningRange || hasInvalidPlanningRange}
            aria-label="Refresh task readiness warnings"
          >
            <RefreshCw className={`h-4 w-4 ${isFetchingSnapshot ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={onToggleVisibility}
            aria-label={isVisible ? 'Hide readiness snapshot' : 'Show readiness snapshot'}
          >
            {isVisible ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
        <div className="flex items-start gap-2">
          <div className="space-y-1">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Readiness Snapshot
            </CardTitle>
            <CardDescription>
              Scope-level readiness for operational day range (
              {formatScopeLabel(planningDateFrom, planningDateTo)}
              ).
            </CardDescription>
          </div>
        </div>
        {hasIncompletePlanningRange && (
          <p className="text-sm text-muted-foreground">Select a date range to load readiness snapshot.</p>
        )}
        {hasInvalidPlanningRange && (
          <p className="text-sm text-destructive">Scope end date must be on or after start date.</p>
        )}
      </CardHeader>
      <CardContent>
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${isVisible ? 'max-h-[640px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}
          aria-hidden={!isVisible}
        >
          {isLoadingSnapshot || isFetchingSnapshot
            ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                  {['shows-in-scope', 'at-risk', 'without-tasks', 'unassigned-shows', 'unassigned-tasks', 'missing-types'].map((key) => (
                    <div key={key} className="rounded-md border p-3 space-y-2">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-7 w-14" />
                    </div>
                  ))}
                </div>
              )
            : (
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                    {readinessMetrics.map((metric) => (
                      <div key={metric.label} className="rounded-md border p-3">
                        <div className="flex items-center gap-1">
                          <p className="text-xs text-muted-foreground">{metric.label}</p>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 text-muted-foreground"
                                aria-label={`About ${metric.label}`}
                              >
                                <Info className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-64 text-xs">
                              {metric.tooltip}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <p className="text-xl font-semibold">{metric.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
        </div>
      </CardContent>
    </Card>
  );
}

function StudioShowsTableSection({
  studioId,
  scopeDateFrom,
  scopeDateTo,
  scopeLabel,
  needsAttention,
  onShowsMutated,
  onToggleNeedsAttention,
}: {
  studioId: string;
  scopeDateFrom?: string;
  scopeDateTo?: string;
  scopeLabel: string;
  needsAttention: boolean;
  onShowsMutated: () => void;
  onToggleNeedsAttention: () => void;
}) {
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
  } = useStudioShows({ studioId, dateFrom: scopeDateFrom, dateTo: scopeDateTo, needsAttention });

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

  const { data: showLookups } = useShowLookupsQuery(studioId);

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
            clearSelectedShows();
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
            clearSelectedShows();
            void refetch();
            onShowsMutated();
          }}
          shows={bulkAssigningShows}
        />
      )}
    </>
  );
}
