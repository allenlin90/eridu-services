import { createFileRoute } from '@tanstack/react-router';

import { STUDIO_ROLE } from '@eridu/api-types/memberships';
import { adaptColumnFiltersChange, adaptPaginationChange } from '@eridu/ui';

import { StudioRouteGuard } from '@/components/guards/studio-route-guard';
import { PageLayout } from '@/components/layouts/page-layout';
import { StudioMembersTable } from '@/features/studio-members/components/studio-members-table';
import { studioMembersSearchSchema } from '@/features/studio-members/config/studio-members-search-schema';
import { useStudioMembers } from '@/features/studio-members/hooks/use-studio-members';
import { useStudioAccess } from '@/lib/hooks/use-studio-access';
import { useSession } from '@/lib/session-provider';

export const Route = createFileRoute('/studios/$studioId/members')({
  component: StudioMembersPage,
  validateSearch: (search) => studioMembersSearchSchema.parse(search),
});

function StudioMembersPage() {
  const { studioId } = Route.useParams();

  return (
    <StudioRouteGuard
      studioId={studioId}
      routeKey="members"
      deniedTitle="Studio Settings Access Required"
      deniedDescription="Only studio admins and managers can access the member roster."
    >
      <StudioMembersContent studioId={studioId} />
    </StudioRouteGuard>
  );
}

function StudioMembersContent({ studioId }: { studioId: string }) {
  const { role } = useStudioAccess(studioId);
  const { session } = useSession();

  const {
    members,
    isLoading,
    isFetching,
    pagination,
    onPaginationChange,
    columnFilters,
    onColumnFiltersChange,
    handleRefresh,
  } = useStudioMembers({ studioId });

  const isAdmin = role === STUDIO_ROLE.ADMIN;
  const currentUserEmail = session?.user?.email;

  return (
    <PageLayout
      title="Studio Members"
      description="Manage team members, roles, and hourly rates."
    >
      <StudioMembersTable
        studioId={studioId}
        members={members}
        isLoading={isLoading}
        isFetching={isFetching}
        isAdmin={isAdmin}
        currentUserEmail={currentUserEmail}
        pagination={pagination}
        onPaginationChange={adaptPaginationChange(pagination, onPaginationChange)}
        columnFilters={columnFilters}
        onColumnFiltersChange={adaptColumnFiltersChange(columnFilters, onColumnFiltersChange)}
        onRefresh={handleRefresh}
      />
    </PageLayout>
  );
}
