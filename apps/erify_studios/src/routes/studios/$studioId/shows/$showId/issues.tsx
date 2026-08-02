import { createFileRoute } from '@tanstack/react-router';

import { STUDIO_ROLE } from '@eridu/api-types/memberships';
import { adaptColumnFiltersChange, adaptPaginationChange } from '@eridu/ui';

import { StudioRouteGuard } from '@/components/guards/studio-route-guard';
import { ShowIssuesTable } from '@/features/studio-shows/components/show-issues-table';
import { showIssuesSearchSchema } from '@/features/studio-shows/config/show-issue-search-schema';
import { useShowIssues } from '@/features/studio-shows/hooks/use-show-issues';
import { useStudioAccess } from '@/lib/hooks/use-studio-access';
import { useUserProfile } from '@/lib/hooks/use-user';

export const Route = createFileRoute('/studios/$studioId/shows/$showId/issues')({
  component: ShowIssuesPage,
  validateSearch: (search) => showIssuesSearchSchema.parse(search),
});

function ShowIssuesPage() {
  const { studioId, showId } = Route.useParams();
  const { role } = useStudioAccess(studioId);
  const { data: profile } = useUserProfile();

  const {
    issues,
    isLoading,
    isFetching,
    pagination,
    onPaginationChange,
    columnFilters,
    onColumnFiltersChange,
    handleRefresh,
  } = useShowIssues({ studioId, showId });

  const canManageIssues = role === STUDIO_ROLE.ADMIN || role === STUDIO_ROLE.MANAGER;

  return (
    <StudioRouteGuard studioId={studioId} routeKey="showIssues">
      <div className="space-y-4">
        <h2 className="text-sm font-semibold">Issues</h2>
        <ShowIssuesTable
          studioId={studioId}
          showId={showId}
          issues={issues}
          isLoading={isLoading}
          isFetching={isFetching}
          canManageIssues={canManageIssues}
          currentUserUid={profile?.uid}
          pagination={pagination}
          onPaginationChange={adaptPaginationChange(pagination, onPaginationChange)!}
          columnFilters={columnFilters}
          onColumnFiltersChange={adaptColumnFiltersChange(columnFilters, onColumnFiltersChange)!}
          onRefresh={handleRefresh}
        />
      </div>
    </StudioRouteGuard>
  );
}
