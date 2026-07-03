import { createFileRoute } from '@tanstack/react-router';

import { STUDIO_ROLE } from '@eridu/api-types/memberships';
import { adaptColumnFiltersChange, adaptPaginationChange } from '@eridu/ui';

import { PageLayout } from '@/components/layouts/page-layout';
import { StudioCreatorRosterTable } from '@/features/studio-creator-roster/components/studio-creator-roster-table';
import { studioCreatorRosterSearchSchema } from '@/features/studio-creator-roster/config/studio-creator-roster-search-schema';
import { useStudioCreatorRoster } from '@/features/studio-creator-roster/hooks/use-studio-creator-roster';
import { useStudioAccess } from '@/lib/hooks/use-studio-access';

export const Route = createFileRoute('/studios/$studioId/creators/')({
  component: StudioCreatorRosterPage,
  validateSearch: (search) => studioCreatorRosterSearchSchema.parse(search),
});

function StudioCreatorRosterPage() {
  const { studioId } = Route.useParams();
  const { role } = useStudioAccess(studioId);
  const {
    creators,
    isLoading,
    isFetching,
    pagination,
    onPaginationChange,
    columnFilters,
    onColumnFiltersChange,
    handleRefresh,
  } = useStudioCreatorRoster({ studioId });

  const canManageRoster = role === STUDIO_ROLE.ADMIN
    || role === STUDIO_ROLE.MANAGER
    || role === STUDIO_ROLE.TALENT_MANAGER;
  const canReviewCompensation = role === STUDIO_ROLE.ADMIN || role === STUDIO_ROLE.MANAGER;

  return (
    <PageLayout
      title="Creator Roster"
      description="Manage studio creator defaults, reactivation, and assignment eligibility."
    >
      <StudioCreatorRosterTable
        studioId={studioId}
        creators={creators}
        isLoading={isLoading}
        isFetching={isFetching}
        canManageRoster={canManageRoster}
        canReviewCompensation={canReviewCompensation}
        pagination={pagination}
        onPaginationChange={adaptPaginationChange(pagination, onPaginationChange)!}
        columnFilters={columnFilters}
        onColumnFiltersChange={adaptColumnFiltersChange(columnFilters, onColumnFiltersChange)!}
        onRefresh={handleRefresh}
      />
    </PageLayout>
  );
}
