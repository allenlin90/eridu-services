import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';

import { STUDIO_ROLE } from '@eridu/api-types/memberships';
import {
  adaptColumnFiltersChange,
  adaptPaginationChange,
  useTableUrlState,
} from '@eridu/ui';

import { StudioRouteGuard } from '@/components/guards/studio-route-guard';
import { PageLayout } from '@/components/layouts/page-layout';
import { studioMemberKeys, useStudioMembers } from '@/features/studio-members/api/members';
import { studioMembersSearchSchema } from '@/features/studio-members/config/studio-members-search-schema';
import { StudioMembersTable } from '@/features/studio-members/components/studio-members-table';
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
  const queryClient = useQueryClient();
  const { data, isLoading, isFetching } = useStudioMembers(studioId);
  const { role } = useStudioAccess(studioId);
  const { session } = useSession();

  const {
    pagination,
    onPaginationChange,
    columnFilters,
    onColumnFiltersChange,
  } = useTableUrlState({ from: '/studios/$studioId/members' });

  const isAdmin = role === STUDIO_ROLE.ADMIN;
  const currentUserEmail = session?.user?.email;
  const members = data?.data ?? [];

  const handleRefresh = () => {
    void queryClient.invalidateQueries({ queryKey: studioMemberKeys.listPrefix(studioId) });
  };

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
