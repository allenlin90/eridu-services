import { createFileRoute } from '@tanstack/react-router';

import { STUDIO_ROLE } from '@eridu/api-types/memberships';

import { StudioRouteGuard } from '@/components/guards/studio-route-guard';
import { PageLayout } from '@/components/layouts/page-layout';
import { useStudioMembers } from '@/features/studio-members/api/members';
import { StudioMembersTable } from '@/features/studio-members/components/studio-members-table';
import { useStudioAccess } from '@/lib/hooks/use-studio-access';
import { useSession } from '@/lib/session-provider';

export const Route = createFileRoute('/studios/$studioId/members')({
  component: StudioMembersPage,
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
  const { data, isLoading } = useStudioMembers(studioId);
  const { role } = useStudioAccess(studioId);
  const { session } = useSession();

  const isAdmin = role === STUDIO_ROLE.ADMIN;
  // Use current user email to identify self row — membership UID not in profile payload
  const currentUserEmail = session?.user?.email;
  const members = data?.data ?? [];

  return (
    <PageLayout
      title="Studio Members"
      description="Manage team members, roles, and hourly rates."
    >
      <StudioMembersTable
        studioId={studioId}
        members={members}
        isLoading={isLoading}
        isAdmin={isAdmin}
        currentUserEmail={currentUserEmail}
      />
    </PageLayout>
  );
}
