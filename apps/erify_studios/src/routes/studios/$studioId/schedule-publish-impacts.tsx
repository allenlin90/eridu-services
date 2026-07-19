import { createFileRoute } from '@tanstack/react-router';
import type { PaginationState, Updater } from '@tanstack/react-table';
import { useCallback, useMemo, useState } from 'react';

import type {
  ScheduleConflictResolutionStatus,
  SchedulePublishImpactKind,
  SchedulePublishImpactRow,
  SchedulePublishImpactSummary,
} from '@eridu/api-types/shows';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DataTable,
  DataTablePagination,
} from '@eridu/ui';

import { StudioRouteGuard } from '@/components/guards/studio-route-guard';
import { PageLayout } from '@/components/layouts/page-layout';
import { usePublishRunsQuery } from '@/features/shows/api/get-publish-runs';
import { useSchedulePublishImpactSummaryQuery } from '@/features/shows/api/get-schedule-publish-impact-summary';
import { useSchedulePublishImpactsQuery } from '@/features/shows/api/get-schedule-publish-impacts';
import { PublishRunsTable } from '@/features/shows/components/publish-runs-table';
import { ScheduleConflictReviewPanel } from '@/features/shows/components/schedule-conflict-review-panel';
import { createSchedulePublishImpactColumns } from '@/features/shows/components/schedule-publish-impacts-columns';
import { SchedulePublishImpactsToolbar } from '@/features/shows/components/schedule-publish-impacts-toolbar';
import type {
  SchedulePublishImpactsSearch,
  SchedulePublishImpactsTab,
} from '@/features/shows/config/schedule-publish-impacts-search-schema';
import {
  buildSchedulePublishImpactsQueryParams,
  SCHEDULE_PUBLISH_IMPACTS_DEFAULT_PAGE_SIZE,
  schedulePublishImpactsSearchSchema,
  searchForTabSwitch,
} from '@/features/shows/config/schedule-publish-impacts-search-schema';
import * as m from '@/paraglide/messages';

const RUNS_PAGE_SIZE = 25;

export const Route = createFileRoute('/studios/$studioId/schedule-publish-impacts')({
  component: SchedulePublishImpactsPage,
  validateSearch: (search) => schedulePublishImpactsSearchSchema.parse(search),
});

function SchedulePublishImpactsPage() {
  const { studioId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const handleTabChange = useCallback((tab: SchedulePublishImpactsTab) => {
    // Switching tabs replaces the whole search state so the other tab's
    // filters and pagination never leak across (operations-review-surface).
    void navigate({ search: searchForTabSwitch(tab), replace: true });
  }, [navigate]);

  return (
    <StudioRouteGuard
      studioId={studioId}
      routeKey="schedulePublishImpacts"
      deniedTitle={m.schedule_publish_impacts_denied_title()}
      deniedDescription={m.schedule_publish_impacts_denied_desc()}
    >
      <PageLayout
        title={m.schedule_publish_impacts_page_title()}
        description={m.schedule_publish_impacts_page_desc()}
      >
        <div className="space-y-4 min-w-0 w-full overflow-hidden">
          <TabNav activeTab={search.tab} onTabChange={handleTabChange} />
          {search.tab === 'runs'
            ? <RunsTab studioId={studioId} search={search} />
            : <ImpactsTab studioId={studioId} search={search} />}
        </div>
      </PageLayout>
    </StudioRouteGuard>
  );
}

function TabNav({ activeTab, onTabChange }: {
  activeTab: SchedulePublishImpactsTab;
  onTabChange: (tab: SchedulePublishImpactsTab) => void;
}) {
  const items: { tab: SchedulePublishImpactsTab; label: string }[] = [
    { tab: 'impacts', label: 'Impacts' },
    { tab: 'runs', label: 'Publish runs' },
  ];
  return (
    <div className="flex w-fit items-center gap-1 rounded-lg bg-muted p-1 text-xs">
      {items.map((item) => (
        <button
          key={item.tab}
          type="button"
          onClick={() => onTabChange(item.tab)}
          className={`rounded-md px-3 py-1.5 font-medium transition-all ${
            activeTab === item.tab
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function ImpactsTab({ studioId, search }: {
  studioId: string;
  search: SchedulePublishImpactsSearch;
}) {
  const navigate = Route.useNavigate();
  const pageSize = search.page_size ?? SCHEDULE_PUBLISH_IMPACTS_DEFAULT_PAGE_SIZE;

  const params = useMemo(() => buildSchedulePublishImpactsQueryParams(search), [search]);
  const summaryParams = useMemo(() => {
    const { page: _page, limit: _limit, ...filters } = params;
    return filters;
  }, [params]);

  const { data, isLoading, isFetching, refetch } = useSchedulePublishImpactsQuery(studioId, params);
  const { data: summary } = useSchedulePublishImpactSummaryQuery(studioId, summaryParams);
  const rows = data?.data ?? [];
  const total = data?.meta?.total ?? 0;
  const pageCount = data?.meta?.totalPages ?? 0;

  const [selectedRow, setSelectedRow] = useState<SchedulePublishImpactRow | null>(null);
  const handleReview = useCallback((row: SchedulePublishImpactRow) => {
    setSelectedRow(row);
  }, []);

  const columns = useMemo(
    () => createSchedulePublishImpactColumns(studioId, handleReview),
    [studioId, handleReview],
  );

  // Every filter change lands on page 1; only pagination keeps the page.
  const setFilters = useCallback((updates: Partial<SchedulePublishImpactsSearch>) => {
    void navigate({
      search: (previous: SchedulePublishImpactsSearch) => ({
        ...previous,
        ...updates,
        page: 1,
      }),
      replace: true,
    });
  }, [navigate]);

  const toggleImpactKind = useCallback((kind: SchedulePublishImpactKind) => {
    const current = search.impact_kind ?? [];
    const next = current.includes(kind)
      ? current.filter((value) => value !== kind)
      : [...current, kind];
    setFilters({ impact_kind: next.length > 0 ? next : undefined });
  }, [search.impact_kind, setFilters]);

  const toggleResolutionStatus = useCallback((status: ScheduleConflictResolutionStatus) => {
    const current = search.resolution_status ?? [];
    const next = current.includes(status)
      ? current.filter((value) => value !== status)
      : [...current, status];
    setFilters({ resolution_status: next.length > 0 ? next : undefined });
  }, [search.resolution_status, setFilters]);

  const clearFilters = useCallback(() => {
    void navigate({
      search: {
        ...searchForTabSwitch('impacts'),
        ...(search.page_size ? { page_size: search.page_size } : {}),
      },
      replace: true,
    });
  }, [navigate, search.page_size]);

  const handlePaginationChange = useCallback((updater: Updater<PaginationState>) => {
    const current: PaginationState = {
      pageIndex: (search.page ?? 1) - 1,
      pageSize,
    };
    const next = typeof updater === 'function' ? updater(current) : updater;
    void navigate({
      search: (previous: SchedulePublishImpactsSearch) => ({
        ...previous,
        page: next.pageIndex + 1,
      }),
      replace: true,
    });
  }, [navigate, search.page, pageSize]);

  const paginationState: PaginationState = {
    pageIndex: (search.page ?? 1) - 1,
    pageSize,
  };

  return (
    <>
      <ImpactSummaryCards
        summary={summary}
        fallbackTotal={total}
        showResolved={(search.resolution_status ?? []).some((status) => status !== 'pending')}
      />

      <SchedulePublishImpactsToolbar
        startFrom={search.start_from ?? ''}
        startTo={search.start_to ?? ''}
        onStartRangeChange={(from, to) => setFilters({
          start_from: from || undefined,
          start_to: to || undefined,
        })}
        changedFrom={search.changed_from ?? ''}
        changedTo={search.changed_to ?? ''}
        onChangedRangeChange={(from, to) => setFilters({
          changed_from: from || undefined,
          changed_to: to || undefined,
        })}
        selectedImpactKinds={search.impact_kind ?? []}
        onToggleImpactKind={toggleImpactKind}
        selectedResolutionStatuses={search.resolution_status ?? []}
        onToggleResolutionStatus={toggleResolutionStatus}
        publishRunId={search.publish_run_id}
        onClearPublishRun={() => setFilters({ publish_run_id: undefined })}
        pageSize={pageSize}
        onPageSizeChange={(value) => setFilters({ page_size: value as SchedulePublishImpactsSearch['page_size'] })}
        onClearFilters={clearFilters}
        isFetching={isFetching}
        onRefresh={() => void refetch()}
      />

      <DataTable
        data={rows}
        columns={columns}
        isLoading={isLoading}
        isFetching={isFetching}
        emptyMessage={m.schedule_publish_impacts_empty()}
        manualPagination
        pageCount={pageCount}
        paginationState={paginationState}
        onPaginationChange={handlePaginationChange}
        getRowClassName={(row) => (
          row.impact_kind === 'stale_conflict' && row.resolution_status !== 'pending'
            ? 'opacity-50'
            : undefined
        )}
        renderFooter={() => (
          <DataTablePagination
            pagination={{
              pageIndex: paginationState.pageIndex,
              pageSize: paginationState.pageSize,
              total,
              pageCount,
            }}
            onPaginationChange={handlePaginationChange}
          />
        )}
      />

      <ScheduleConflictReviewPanel
        studioId={studioId}
        row={selectedRow}
        open={selectedRow !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedRow(null);
          }
        }}
      />
    </>
  );
}

function ImpactSummaryCards({ summary, fallbackTotal, showResolved }: {
  summary: SchedulePublishImpactSummary | undefined;
  fallbackTotal: number;
  showResolved: boolean;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <ImpactSummaryCard
        title="Total impacts"
        value={summary?.total ?? fallbackTotal}
        description="All impacts matching the current filters"
      />
      <ImpactSummaryCard
        title="Updated"
        value={summary?.confirmed_future_updated ?? 0}
        description="Confirmed future shows changed by publish"
      />
      <ImpactSummaryCard
        title="Pending resolution"
        value={summary?.confirmed_future_pending_resolution ?? 0}
        description="Missing confirmed shows awaiting sign-off"
      />
      <ImpactSummaryCard
        title="Needs review"
        value={summary?.stale_conflict_pending ?? 0}
        description="Held-back sheet edits awaiting a decision"
      />
      {showResolved && (
        <ImpactSummaryCard
          title="Resolved conflicts"
          value={summary?.stale_conflict_resolved ?? 0}
          description="Conflict history matching the selected resolved statuses"
        />
      )}
      <ImpactSummaryCard
        title="Creators backfilled"
        value={summary?.past_show_creator_backfilled ?? 0}
        description="Past shows whose creator mappings were filled from the sheet"
      />
    </div>
  );
}

function ImpactSummaryCard({ title, value, description }: {
  title: string;
  value: number;
  description: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl">{value.toLocaleString()}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        {description}
      </CardContent>
    </Card>
  );
}

function RunsTab({ studioId, search }: {
  studioId: string;
  search: SchedulePublishImpactsSearch;
}) {
  const navigate = Route.useNavigate();
  const runsPage = search.runs_page ?? 1;

  const params = useMemo(() => ({ page: runsPage, limit: RUNS_PAGE_SIZE }), [runsPage]);
  const { data, isLoading, isFetching } = usePublishRunsQuery(studioId, params);
  const rows = data?.data ?? [];
  const total = data?.meta?.total ?? 0;
  const pageCount = data?.meta?.totalPages ?? 0;

  const handleViewImpacts = useCallback((runId: string) => {
    void navigate({
      search: { ...searchForTabSwitch('impacts'), publish_run_id: runId },
      replace: true,
    });
  }, [navigate]);

  const handlePaginationChange = useCallback((updater: Updater<PaginationState>) => {
    const current: PaginationState = { pageIndex: runsPage - 1, pageSize: RUNS_PAGE_SIZE };
    const next = typeof updater === 'function' ? updater(current) : updater;
    void navigate({
      search: (previous: SchedulePublishImpactsSearch) => ({
        ...previous,
        runs_page: next.pageIndex + 1,
      }),
      replace: true,
    });
  }, [navigate, runsPage]);

  return (
    <PublishRunsTable
      rows={rows}
      total={total}
      pageCount={pageCount}
      isLoading={isLoading}
      isFetching={isFetching}
      paginationState={{ pageIndex: runsPage - 1, pageSize: RUNS_PAGE_SIZE }}
      onPaginationChange={handlePaginationChange}
      onViewImpacts={handleViewImpacts}
    />
  );
}
