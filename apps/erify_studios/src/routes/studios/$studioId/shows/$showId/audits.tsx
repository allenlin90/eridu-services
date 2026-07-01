import { createFileRoute, Link } from '@tanstack/react-router';
import type { ColumnDef, PaginationState, Updater } from '@tanstack/react-table';
import { format } from 'date-fns';
import { RefreshCw } from 'lucide-react';
import { useCallback, useMemo } from 'react';
import { z } from 'zod';

import type { AuditApiResponse } from '@eridu/api-types/audits';
import {
  Badge,
  Button,
  DataTable,
  DataTablePagination,
} from '@eridu/ui';

import { useShowAuditsQuery } from '@/features/studio-shows/api/get-show-audits';

const PAGE_SIZE = 25;

const showAuditsSearchSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
});

type ShowAuditsSearch = z.infer<typeof showAuditsSearchSchema>;

export const Route = createFileRoute('/studios/$studioId/shows/$showId/audits')({
  component: ShowAuditsPage,
  validateSearch: (search) => showAuditsSearchSchema.parse(search),
});

function ShowAuditsPage() {
  const { studioId, showId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const params = useMemo(() => ({
    page: search.page,
    limit: PAGE_SIZE,
  }), [search.page]);

  const { data, isLoading, isFetching, refetch } = useShowAuditsQuery(studioId, showId, params);
  const rows = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const pageCount = data?.meta.totalPages ?? 0;

  const columns = useMemo(() => createColumns(studioId), [studioId]);

  const handlePaginationChange = useCallback((updater: Updater<PaginationState>) => {
    const current: PaginationState = {
      pageIndex: search.page - 1,
      pageSize: PAGE_SIZE,
    };
    const next = typeof updater === 'function' ? updater(current) : updater;
    void navigate({
      search: (previous: ShowAuditsSearch) => ({
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
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-semibold">Audit Logs & History</h2>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => void refetch()}
          disabled={isFetching}
          aria-label="Refresh audits"
        >
          <RefreshCw className={isFetching ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
        </Button>
      </div>

      <DataTable
        data={rows}
        columns={columns}
        isLoading={isLoading}
        isFetching={isFetching}
        emptyMessage="No audits recorded for this show."
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
  );
}

function createColumns(studioId: string): ColumnDef<AuditApiResponse>[] {
  return [
    {
      id: 'action',
      header: 'Action',
      cell: ({ row }) => {
        const action = row.original.action;
        let variant: 'secondary' | 'destructive' | 'outline' | 'default' = 'outline';
        if (action === 'CREATE')
          variant = 'default';
        if (action === 'DELETE')
          variant = 'destructive';
        if (action === 'OVERRIDE')
          variant = 'secondary';
        return <Badge variant={variant}>{action}</Badge>;
      },
    },
    {
      id: 'description',
      header: 'Description',
      cell: ({ row }) => {
        const meta = row.original.metadata;
        const reason = row.original.reason;

        // Custom renderer for schedule publish impacts
        if (meta && typeof meta === 'object' && 'event' in meta && meta.event === 'schedule_publish_impact') {
          const impactKind = meta.impact_kind === 'confirmed_future_pending_resolution'
            ? 'Confirmed show removed from planning sheet (Pending Resolution)'
            : 'Confirmed show modified in planning sheet';

          const changedFields = Array.isArray(meta.changed_fields) ? meta.changed_fields.join(', ') : '';
          const relationChanges = meta.relation_changes && typeof meta.relation_changes === 'object'
            ? meta.relation_changes
            : {};

          const relationsList: string[] = [];
          Object.entries(relationChanges).forEach(([key, val]) => {
            if (typeof val === 'number' && val > 0) {
              relationsList.push(`${key}: ${val}`);
            }
          });

          return (
            <div className="space-y-1">
              <span className="font-medium text-foreground">{impactKind}</span>
              {changedFields && (
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium">Fields:</span>
                  {' '}
                  {changedFields}
                </div>
              )}
              {relationsList.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium">Relation diffs:</span>
                  {' '}
                  {relationsList.join(', ')}
                </div>
              )}
              <Link
                to="/studios/$studioId/schedule-publish-impacts"
                params={{ studioId }}
                className="text-primary font-medium hover:underline text-xs block mt-1"
              >
                View in Publish Audit list
              </Link>
            </div>
          );
        }

        // Generic fallback description
        let text = `Modified show attributes.`;
        if (reason) {
          text = `${text} Reason: ${reason}`;
        }
        return <div className="text-sm text-foreground max-w-md break-words">{text}</div>;
      },
    },
    {
      id: 'actor',
      header: 'Actor',
      cell: ({ row }) => {
        const actorUid = row.original.actor_uid;
        if (!actorUid) {
          const meta = row.original.metadata;
          if (meta && typeof meta === 'object' && 'ingestion_source' in meta) {
            return (
              <span className="text-xs text-muted-foreground">
                System (
                {String(meta.ingestion_source)}
                )
              </span>
            );
          }
          return <span className="text-xs text-muted-foreground">System</span>;
        }
        return <span className="text-sm font-medium">{actorUid}</span>;
      },
    },
    {
      id: 'created_at',
      header: 'Recorded',
      cell: ({ row }) => format(new Date(row.original.created_at), 'MMM d, yyyy h:mm a'),
    },
  ];
}
