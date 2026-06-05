import { createFileRoute, Link, Outlet } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';

import { Badge, Button } from '@eridu/ui';

import { PageLayout } from '@/components/layouts/page-layout';
import { useStudioMember } from '@/features/studio-members/api/members';
import { ROLE_LABELS } from '@/features/studio-members/lib/roles';
import { useStudioAccess } from '@/lib/hooks/use-studio-access';

export const Route = createFileRoute('/studios/$studioId/members/$memberId')({
  component: StudioMemberDetailLayout,
});

const TAB_LINK_CLASS = 'inline-flex items-center border-b-2 border-transparent px-1 pb-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground';
const TAB_LINK_ACTIVE_CLASS = 'border-primary text-foreground';

function BackToMembers({ studioId }: { studioId: string }) {
  return (
    <Button variant="outline" size="sm" asChild>
      <Link to="/studios/$studioId/members" params={{ studioId }}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Members
      </Link>
    </Button>
  );
}

function StudioMemberDetailLayout() {
  const { studioId, memberId } = Route.useParams();
  const { hasAccess } = useStudioAccess(studioId);
  const canViewCompensation = hasAccess('members');

  const { data: member, isLoading, isError } = useStudioMember(studioId, memberId);

  if (isLoading) {
    return (
      <PageLayout title="Member" actions={<BackToMembers studioId={studioId} />}>
        <p className="rounded-md border p-3 text-sm text-muted-foreground">
          Loading member...
        </p>
      </PageLayout>
    );
  }

  if (isError || !member) {
    return (
      <PageLayout title="Member" actions={<BackToMembers studioId={studioId} />}>
        <p className="rounded-md border p-3 text-sm text-destructive">
          Failed to load this member. They may not belong to this studio.
        </p>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title={member.user_name}
      description={member.user_email}
      actions={(
        <div className="flex items-center gap-3">
          <Badge variant="outline">
            {ROLE_LABELS[member.role] ?? member.role}
          </Badge>
          <BackToMembers studioId={studioId} />
        </div>
      )}
    >
      <div className="space-y-4">
        <nav className="flex gap-6 border-b">
          <Link
            to="/studios/$studioId/members/$memberId"
            params={{ studioId, memberId }}
            activeOptions={{ exact: true }}
            className={TAB_LINK_CLASS}
            activeProps={{ className: `${TAB_LINK_CLASS} ${TAB_LINK_ACTIVE_CLASS}` }}
          >
            Defaults
          </Link>
          {canViewCompensation
            ? (
                <Link
                  to="/studios/$studioId/members/$memberId/compensations"
                  params={{ studioId, memberId }}
                  className={TAB_LINK_CLASS}
                  activeProps={{ className: `${TAB_LINK_CLASS} ${TAB_LINK_ACTIVE_CLASS}` }}
                >
                  Compensation
                </Link>
              )
            : null}
        </nav>

        <Outlet />
      </div>
    </PageLayout>
  );
}
