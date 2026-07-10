import { createFileRoute, Link } from '@tanstack/react-router';
import type { ColumnDef, PaginationState, Updater } from '@tanstack/react-table';
import { format } from 'date-fns';
import { RefreshCw } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { z } from 'zod';

import type { SchedulePublishImpactRow } from '@eridu/api-types/shows';
import {
  Badge,
  Button,
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
import { useSchedulePublishImpactsQuery } from '@/features/shows/api/get-schedule-publish-impacts';
import { ScheduleConflictReviewPanel } from '@/features/shows/components/schedule-conflict-review-panel';
import * as m from '@/paraglide/messages';

const PAGE_SIZE = 25;

const schedulePublishImpactsSearchSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
});

type SchedulePublishImpactsSearch = z.infer<typeof schedulePublishImpactsSearchSchema>;

export const Route = createFileRoute('/studios/$studioId/schedule-publish-impacts')({
  component: SchedulePublishImpactsPage,
  validateSearch: (search) => schedulePublishImpactsSearchSchema.parse(search),
});

function SchedulePublishImpactsPage() {
  const { studioId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const params = useMemo(() => ({
    page: search.page,
    limit: PAGE_SIZE,
  }), [search.page]);

  const { data, isLoading, isFetching, refetch } = useSchedulePublishImpactsQuery(studioId, params);
  const rows = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const pageCount = data?.meta.totalPages ?? 0;
  const pendingResolutionCount = rows.filter((row) => row.impact_kind === 'confirmed_future_pending_resolution').length;
  const updatedCount = rows.filter((row) => row.impact_kind === 'confirmed_future_updated').length;
  const needsReviewCount = rows.filter((row) => row.impact_kind === 'stale_conflict' && row.resolution_status === 'pending').length;

  const [selectedRow, setSelectedRow] = useState<SchedulePublishImpactRow | null>(null);
  const handleReview = useCallback((row: SchedulePublishImpactRow) => {
    setSelectedRow(row);
  }, []);

  const columns = useMemo(() => createColumns(studioId, handleReview), [studioId, handleReview]);

  const handlePaginationChange = useCallback((updater: Updater<PaginationState>) => {
    const current: PaginationState = {
      pageIndex: search.page - 1,
      pageSize: PAGE_SIZE,
    };
    const next = typeof updater === 'function' ? updater(current) : updater;
    void navigate({
      search: (previous: SchedulePublishImpactsSearch) => ({
        ...previous,
        page: next.pageIndex + 1,
      }),
      replace: true,
    });
  }, [navigate, search.page]);

  const paginationState: PaginationState = {
    pageIndex: search.page - 1,
    pageSize: PAGE_SIZE,
  };

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
        actions={(
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => void refetch()}
            disabled={isFetching}
            aria-label={m.schedule_publish_impacts_refresh_label()}
          >
            <RefreshCw className={isFetching ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
          </Button>
        )}
      >
        <div className="space-y-4 min-w-0 w-full overflow-hidden">
          <div className="grid gap-3 md:grid-cols-3">
            <ImpactSummaryCard
              title={m.schedule_publish_impacts_summary_upcoming_title()}
              value={total}
              description={m.schedule_publish_impacts_summary_upcoming_desc()}
            />
            <ImpactSummaryCard
              title={m.schedule_publish_impacts_summary_updated_title()}
              value={updatedCount}
              description={m.schedule_publish_impacts_summary_updated_desc()}
            />
            <ImpactSummaryCard
              title={m.schedule_publish_impacts_summary_pending_title()}
              value={pendingResolutionCount}
              description={m.schedule_publish_impacts_summary_pending_desc()}
            />
          </div>

          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">{m.schedule_publish_impacts_all_impacts_heading()}</h3>
            {needsReviewCount > 0
              ? (
                  <span className="text-xs text-muted-foreground">
                    {m.schedule_publish_impacts_needs_review_count({ count: needsReviewCount })}
                  </span>
                )
              : null}
          </div>

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
        </div>
      </PageLayout>

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
    </StudioRouteGuard>
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

function createColumns(
  studioId: string,
  onReview: (row: SchedulePublishImpactRow) => void,
): ColumnDef<SchedulePublishImpactRow>[] {
  return [
    {
      id: 'show',
      header: m.schedule_publish_impacts_column_show(),
      cell: ({ row }) => (
        <div className="space-y-1">
          <Link
            to="/studios/$studioId/shows/$showId"
            params={{ studioId, showId: row.original.show.id }}
            search={{ page: 1, limit: 10 }}
            className="font-medium text-primary hover:underline"
          >
            {row.original.show.name}
          </Link>
          <div className="text-xs text-muted-foreground">
            {row.original.external_id ?? row.original.show.external_id ?? m.schedule_publish_impacts_no_external_id()}
          </div>
        </div>
      ),
    },
    {
      id: 'impact',
      header: m.schedule_publish_impacts_column_impact(),
      cell: ({ row }) => {
        const impact = row.original;
        if (impact.impact_kind === 'stale_conflict') {
          const isResolved = impact.resolution_status !== 'pending';
          return (
            <Badge
              variant={isResolved ? 'secondary' : 'outline'}
              className={isResolved ? undefined : 'border-amber-500 text-amber-700 dark:border-amber-400 dark:text-amber-300'}
            >
              {isResolved
                ? (impact.resolution_status === 'applied'
                    ? m.schedule_publish_impacts_badge_applied()
                    : impact.resolution_status === 'dismissed'
                      ? m.schedule_publish_impacts_badge_dismissed()
                      : m.schedule_publish_impacts_badge_resolved())
                : m.schedule_publish_impacts_badge_needs_review()}
            </Badge>
          );
        }
        return (
          <Badge variant={impact.impact_kind === 'confirmed_future_pending_resolution' ? 'destructive' : 'secondary'}>
            {impact.impact_kind === 'confirmed_future_pending_resolution'
              ? m.schedule_publish_impacts_badge_pending()
              : m.schedule_publish_impacts_badge_updated()}
          </Badge>
        );
      },
    },
    {
      id: 'start_time',
      header: m.schedule_publish_impacts_column_show_time(),
      cell: ({ row }) => (
        <div className="text-sm">
          {format(new Date(row.original.show.start_time), 'MMM d, yyyy')}
          <div className="text-xs text-muted-foreground">
            {format(new Date(row.original.show.start_time), 'h:mm a')}
            {' - '}
            {format(new Date(row.original.show.end_time), 'h:mm a')}
          </div>
        </div>
      ),
    },
    {
      id: 'status',
      header: m.schedule_publish_impacts_column_status(),
      cell: ({ row }) => (
        row.original.show.status_name
        ?? row.original.show.status_system_key
        ?? m.schedule_publish_impacts_unknown_status()
      ),
    },
    {
      id: 'changed_fields',
      header: m.schedule_publish_impacts_column_changed(),
      cell: ({ row }) => {
        const fields = row.original.changed_fields;
        return fields.length > 0 ? fields.join(', ') : m.schedule_publish_impacts_relation_change();
      },
    },
    {
      id: 'created_at',
      header: m.schedule_publish_impacts_column_recorded(),
      cell: ({ row }) => format(new Date(row.original.created_at), 'MMM d, h:mm a'),
    },
    {
      id: 'review_action',
      header: '',
      cell: ({ row }) => {
        const impact = row.original;
        if (impact.impact_kind !== 'stale_conflict') {
          return null;
        }
        if (impact.resolution_status !== 'pending') {
          return <span className="text-xs text-muted-foreground">{m.schedule_publish_impacts_resolved_label()}</span>;
        }
        return (
          <Button type="button" variant="outline" size="sm" onClick={() => onReview(impact)}>
            {m.schedule_publish_impacts_review_action()}
          </Button>
        );
      },
    },
  ];
}
