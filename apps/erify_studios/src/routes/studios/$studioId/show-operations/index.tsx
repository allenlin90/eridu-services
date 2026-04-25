import { useQuery } from '@tanstack/react-query';
import { createFileRoute, getRouteApi } from '@tanstack/react-router';
import { AlertTriangle, ListTodo, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DateRange } from 'react-day-picker';

import {
  adaptColumnFiltersChange,
  adaptPaginationChange,
  adaptSortingChange,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  DataTable,
  DataTablePagination,
  DataTableToolbar,
  DatePickerWithRange,
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
import { ShowReadinessTriagePanel } from '@/features/studio-shows/components/show-readiness/show-readiness-triage-panel';
import { columns } from '@/features/studio-shows/components/studio-shows-table/columns';
import { useSelectedRowSnapshots } from '@/features/studio-shows/hooks/use-selected-row-snapshots';
import { useStudioShows } from '@/features/studio-shows/hooks/use-studio-shows';
import {
  normalizeScopeDate,
  parseScopeDateAsLocal,
  toShowScopeDateTimeBounds,
} from '@/features/studio-shows/utils/show-scope.utils';

export const Route = createFileRoute('/studios/$studioId/show-operations/')({
  component: StudioShowOperationsPage,
});
const showOperationsRouteApi = getRouteApi('/studios/$studioId/show-operations');

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

  if (from === to) {
    return from;
  }

  return `${from} to ${to}`;
}

const QUICK_FILTER_COLUMNS: string[] = [];
const FEATURED_FILTER_COLUMNS = ['has_tasks', 'client_name', 'show_status_name'];

function StudioShowOperationsPage() {
  const { studioId } = showOperationsRouteApi.useParams();
  const search = showOperationsRouteApi.useSearch();
  const navigate = showOperationsRouteApi.useNavigate();
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
      to: '/studios/$studioId/show-operations',
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
      title="Show Operations"
      description="Generate tasks, review readiness, and assign work across studio shows."
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
          needsAttention={isNeedsAttentionActive}
          onActivateIssuesFilter={() => {
            if (!isNeedsAttentionActive) {
              updateSearch((previous) => ({
                ...previous,
                page: 1,
                needs_attention: true,
              }));
            }
          }}
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
  needsAttention,
  onActivateIssuesFilter,
  onToggleVisibility,
}: {
  studioId: string;
  scopeDateFrom?: string;
  scopeDateTo?: string;
  refreshSignal: number;
  isVisible: boolean;
  needsAttention: boolean;
  onActivateIssuesFilter: () => void;
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
    match_show_scope: true,
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
    queryFn: ({ signal }) =>
      getStudioShows(studioId, {
        page: 1,
        limit: 1,
        date_from: showScopeDateBounds.date_from,
        date_to: showScopeDateBounds.date_to,
      }, { signal }),
    enabled: !hasIncompletePlanningRange && !hasInvalidPlanningRange,
    // Prevent a spurious GET /studio-shows?page=1&limit=1 every time the user
    // switches back to this tab — the scope-total counter only needs to refresh
    // on explicit user actions (date change, task save), not on window focus.
    refetchOnWindowFocus: false,
  });
  const prevRefreshSignal = useRef(refreshSignal);
  useEffect(() => {
    if (prevRefreshSignal.current === refreshSignal) {
      return;
    }
    prevRefreshSignal.current = refreshSignal;
    if (hasIncompletePlanningRange || hasInvalidPlanningRange) {
      return;
    }
    void refetchShiftAlignment();
    // Scope changes are already handled by the query key; only manually refetch on mutation signal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshSignal, refetchShiftAlignment]);

  const isLoadingSnapshot = isLoadingShiftAlignment || isLoadingShowsScope;
  const isFetchingSnapshot = isFetchingShiftAlignment || isFetchingShowsScope;
  const showsInScopeCount = showsScopeResponse?.meta.total ?? 0;
  const taskReadinessWarnings = shiftAlignmentResponse?.task_readiness_warnings ?? [];
  return (
    <ShowReadinessTriagePanel
      scopeLabel={formatScopeLabel(planningDateFrom, planningDateTo)}
      showsInScopeCount={showsInScopeCount}
      taskReadinessWarnings={taskReadinessWarnings}
      isLoading={isLoadingSnapshot}
      isFetching={isFetchingSnapshot}
      isVisible={isVisible}
      hasIncompletePlanningRange={hasIncompletePlanningRange}
      hasInvalidPlanningRange={hasInvalidPlanningRange}
      needsAttentionActive={needsAttention}
      onRefresh={() => {
        void Promise.all([refetchShiftAlignment(), refetchShowsScope()]);
      }}
      onToggleVisibility={onToggleVisibility}
      onActivateIssuesFilter={onActivateIssuesFilter}
    />
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
  const [bulkGeneratingShows, setBulkGeneratingShows] = useState<StudioShow[] | null>(null);
  const [bulkAssigningShows, setBulkAssigningShows] = useState<StudioShow[] | null>(null);

  const {
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
  } = useStudioShows({ studioId, dateFrom: scopeDateFrom, dateTo: scopeDateTo, needsAttention });

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
    </>
  );
}
