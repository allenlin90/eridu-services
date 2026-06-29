import { createFileRoute, Link } from '@tanstack/react-router';
import type { ColumnDef, PaginationState, Updater } from '@tanstack/react-table';
import { format } from 'date-fns';
import { RefreshCw } from 'lucide-react';
import { useCallback, useMemo } from 'react';
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

  const columns = useMemo(() => createColumns(studioId), [studioId]);

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

function createColumns(studioId: string): ColumnDef<SchedulePublishImpactRow>[] {
  return [
    {
      id: 'show',
      header: m.schedule_publish_impacts_column_show(),
      cell: ({ row }) => (
        <div className="space-y-1">
          <Link
            to="/studios/$studioId/shows/$showId"
            params={{ studioId, showId: row.original.show.id }}
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
      cell: ({ row }) => (
        <Badge variant={row.original.impact_kind === 'confirmed_future_pending_resolution' ? 'destructive' : 'secondary'}>
          {row.original.impact_kind === 'confirmed_future_pending_resolution'
            ? m.schedule_publish_impacts_badge_pending()
            : m.schedule_publish_impacts_badge_updated()}
        </Badge>
      ),
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
  ];
}
