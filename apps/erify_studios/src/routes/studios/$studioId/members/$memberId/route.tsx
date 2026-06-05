import { createFileRoute, Link, Outlet } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';

import type { StudioMemberResponse } from '@eridu/api-types/memberships';
import { Badge, Button } from '@eridu/ui';

import { useStudioMember } from '@/features/studio-members/api/members';
import { ROLE_LABELS } from '@/features/studio-members/lib/roles';
import { toDecimalDisplayString } from '@/lib/decimal-format';
import { useStudioAccess } from '@/lib/hooks/use-studio-access';

export const Route = createFileRoute('/studios/$studioId/members/$memberId')({
  component: StudioMemberDetailLayout,
});

const TAB_LINK_CLASS = 'inline-flex items-center border-b-2 border-transparent px-1 pb-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground';
const TAB_LINK_ACTIVE_CLASS = 'border-primary text-foreground';

function BackToMembers({ studioId }: { studioId: string }) {
  return (
    <Link to="/studios/$studioId/members" params={{ studioId }}>
      <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Back to members">
        <ArrowLeft className="h-4 w-4" />
      </Button>
    </Link>
  );
}

function formatHourlyRate(value: string | null) {
  return value === null ? 'No hourly rate set' : `$${toDecimalDisplayString(value)} / hr`;
}

function MemberHeader({
  studioId,
  member,
  isLoading,
}: {
  studioId: string;
  member?: Pick<StudioMemberResponse, 'user_name' | 'user_email' | 'role' | 'base_hourly_rate'>;
  isLoading: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="flex min-w-0 items-center gap-4">
        <BackToMembers studioId={studioId} />
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold tracking-tight">
            {isLoading && !member ? 'Loading member...' : (member?.user_name ?? 'Member')}
          </h1>
          <p className="truncate text-sm text-muted-foreground">
            {member?.user_email ?? 'Studio member profile and compensation'}
          </p>
        </div>
      </div>

      {member
        ? (
            <div className="rounded-md border bg-muted/20 p-3">
              <p className="text-xs font-medium text-muted-foreground">Member Profile</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge variant="outline">
                  {ROLE_LABELS[member.role] ?? member.role}
                </Badge>
                <Badge variant="secondary">
                  {formatHourlyRate(member.base_hourly_rate)}
                </Badge>
              </div>
            </div>
          )
        : null}
    </div>
  );
}

function StudioMemberDetailLayout() {
  const { studioId, memberId } = Route.useParams();
  const { hasAccess } = useStudioAccess(studioId);
  const canViewCompensation = hasAccess('members');

  const { data: member, isLoading, isError } = useStudioMember(studioId, memberId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <MemberHeader studioId={studioId} isLoading={isLoading} />
        <p className="rounded-md border p-3 text-sm text-muted-foreground">
          Loading member...
        </p>
      </div>
    );
  }

  if (isError || !member) {
    return (
      <div className="space-y-4">
        <MemberHeader studioId={studioId} isLoading={false} />
        <p className="rounded-md border p-3 text-sm text-destructive">
          Failed to load this member. They may not belong to this studio.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <MemberHeader studioId={studioId} member={member} isLoading={isLoading} />

      <div className="space-y-4">
        <nav className="flex gap-6 border-b">
          <Link
            to="/studios/$studioId/members/$memberId"
            params={{ studioId, memberId }}
            activeOptions={{ exact: true }}
            className={TAB_LINK_CLASS}
            activeProps={{ className: `${TAB_LINK_CLASS} ${TAB_LINK_ACTIVE_CLASS}` }}
          >
            Profile
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
    </div>
  );
}
