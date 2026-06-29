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
      deniedTitle="Schedule Impact Access Required"
      deniedDescription="Only studio managers and admins can review schedule publish impacts."
    >
      <PageLayout
        title="Schedule Publish Impacts"
        description="Review upcoming confirmed shows affected by Google Sheets schedule publishes."
        actions={(
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => void refetch()}
            disabled={isFetching}
            aria-label="Refresh schedule publish impacts"
          >
            <RefreshCw className={isFetching ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
          </Button>
        )}
      >
        <div className="space-y-4 min-w-0 w-full overflow-hidden">
          <div className="grid gap-3 md:grid-cols-3">
            <ImpactSummaryCard title="Upcoming impacts" value={total} description="Confirmed shows changed by publish" />
            <ImpactSummaryCard title="Updated" value={updatedCount} description="Rows on this page with field or relation changes" />
            <ImpactSummaryCard title="Pending resolution" value={pendingResolutionCount} description="Rows on this page missing from the sheet" />
          </div>

          <DataTable
            data={rows}
            columns={columns}
            isLoading={isLoading}
            isFetching={isFetching}
            emptyMessage="No upcoming schedule publish impacts."
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
      header: 'Show',
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
            {row.original.external_id ?? row.original.show.external_id ?? 'No external ID'}
          </div>
        </div>
      ),
    },
    {
      id: 'impact',
      header: 'Impact',
      cell: ({ row }) => (
        <Badge variant={row.original.impact_kind === 'confirmed_future_pending_resolution' ? 'destructive' : 'secondary'}>
          {row.original.impact_kind === 'confirmed_future_pending_resolution' ? 'Pending resolution' : 'Updated'}
        </Badge>
      ),
    },
    {
      id: 'start_time',
      header: 'Show Time',
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
      header: 'Status',
      cell: ({ row }) => row.original.show.status_name ?? row.original.show.status_system_key ?? 'Unknown',
    },
    {
      id: 'changed_fields',
      header: 'Changed',
      cell: ({ row }) => {
        const fields = row.original.changed_fields;
        return fields.length > 0 ? fields.join(', ') : 'Relation change';
      },
    },
    {
      id: 'created_at',
      header: 'Recorded',
      cell: ({ row }) => format(new Date(row.original.created_at), 'MMM d, h:mm a'),
    },
  ];
}
