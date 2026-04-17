import { createFileRoute, getRouteApi } from '@tanstack/react-router';
import type { OnChangeFn, RowSelectionState } from '@tanstack/react-table';
import { RefreshCw, UserRound } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DateRange } from 'react-day-picker';

import {
  adaptColumnFiltersChange,
  adaptPaginationChange,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  DataTable,
  DataTablePagination,
  DataTableToolbar,
  DatePickerWithRange,
} from '@eridu/ui';

import { PageLayout } from '@/components/layouts/page-layout';
import { useShowLookupsQuery } from '@/features/shows/api/get-show-lookups';
import { addDays } from '@/features/studio-shifts/utils/shift-date.utils';
import { toLocalDateInputValue } from '@/features/studio-shifts/utils/shift-form.utils';
import { BulkCreatorAssignmentDialog } from '@/features/studio-show-creators/components/bulk-creator-assignment-dialog';
import { creatorMappingShowColumns } from '@/features/studio-show-creators/components/creator-mapping-show-columns';
import { SelectedCreatorMappingMobileActions } from '@/features/studio-show-creators/components/selected-creator-mapping-mobile-actions';
import { useCreatorMappingShows } from '@/features/studio-show-creators/hooks/use-creator-mapping-shows';
import type { StudioShow } from '@/features/studio-shows/api/get-studio-shows';
import {
  normalizeScopeDate,
  parseScopeDateAsLocal,
} from '@/features/studio-shows/utils/show-scope.utils';
import { resolveUpdater } from '@/lib/table-state.utils';

const creatorMappingRouteApi = getRouteApi('/studios/$studioId/creator-mapping');

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

function CreatorMappingPage() {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [selectedShowSnapshots, setSelectedShowSnapshots] = useState<Record<string, StudioShow>>({});
  const [isBulkAssignDialogOpen, setIsBulkAssignDialogOpen] = useState(false);

  const { studioId } = creatorMappingRouteApi.useParams();
  const search = creatorMappingRouteApi.useSearch();
  const navigate = creatorMappingRouteApi.useNavigate();
  const [defaultScopeRange] = useState(() => getDefaultPlanningRange());

  const updateSearch = useCallback((
    updater: (previous: typeof search) => typeof search,
    options?: { replace?: boolean },
  ) => {
    void navigate({
      to: '/studios/$studioId/creator-mapping',
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
  } = useCreatorMappingShows({
    studioId,
    dateFrom: search.date_from,
    dateTo: search.date_to,
  });

  const showsById = useMemo(
    () => Object.fromEntries(shows.map((show) => [show.id, show])),
    [shows],
  );

  const handleRowSelectionChange = useCallback<OnChangeFn<RowSelectionState>>(
    (updater) => {
      const nextSelection = resolveUpdater(updater, rowSelection);
      const selectedIds = new Set(
        Object.entries(nextSelection)
          .filter(([, selected]) => selected)
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

  const selectedShowIds = useMemo(
    () => Object.entries(rowSelection)
      .filter(([, selected]) => Boolean(selected))
      .map(([id]) => id),
    [rowSelection],
  );

  const selectedShows = useMemo(() => {
    return selectedShowIds
      .map((id) => showsById[id] ?? selectedShowSnapshots[id] ?? null)
      .filter((show): show is StudioShow => show !== null);
  }, [selectedShowIds, selectedShowSnapshots, showsById]);

  const clearSelectedShows = useCallback(() => {
    setRowSelection({});
    setSelectedShowSnapshots({});
  }, []);

  const { data: showLookups } = useShowLookupsQuery(studioId);
  const scopeLabel = formatScopeLabel(search.date_from, search.date_to);

  const searchableColumns = useMemo(
    () => [
      { id: 'name', title: 'Show Name', type: 'text' as const },
      {
        id: 'creator_name',
        title: 'Creator',
        type: 'text' as const,
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
        id: 'show_status_name',
        title: 'Show Status',
        type: 'select' as const,
        options: (showLookups?.show_statuses ?? []).map((status) => ({ value: status.name, label: status.name })),
      },
    ],
    [showLookups?.show_statuses],
  );

  return (
    <PageLayout
      title="Creator Mapping"
      description="Assign and manage creators across studio shows."
    >
      <div className="space-y-4 pb-20 md:pb-0">
        <Card>
          <CardHeader className="gap-3">
            <div className="space-y-1">
              <CardTitle className="text-base">Scope</CardTitle>
              <CardDescription>
                This date range applies to the creator mapping show list.
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

        <p className="text-xs text-muted-foreground">
          Showing shows in scope:
          {' '}
          {scopeLabel}
        </p>

        <DataTable
          data={shows}
          columns={creatorMappingShowColumns}
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
          enableRowSelection
          rowSelection={rowSelection}
          onRowSelectionChange={handleRowSelectionChange}
          getRowId={(show) => show.id}
          renderToolbar={(table) => (
            <DataTableToolbar
              table={table}
              searchColumn="name"
              searchableColumns={searchableColumns}
              featuredFilterColumns={['has_creators', 'show_status_name', 'creator_name']}
              searchPlaceholder="Search shows..."
            >
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
      </div>
    </PageLayout>
  );
}

export const Route = createFileRoute('/studios/$studioId/creator-mapping/')({
  component: CreatorMappingPage,
});
