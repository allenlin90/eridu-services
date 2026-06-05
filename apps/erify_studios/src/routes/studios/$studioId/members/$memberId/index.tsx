import { createFileRoute } from '@tanstack/react-router';

import { STUDIO_ROLE } from '@eridu/api-types/memberships';

import { useStudioMember } from '@/features/studio-members/api/members';
import { MemberProfileForm } from '@/features/studio-members/components/member-profile-form';
import { useStudioAccess } from '@/lib/hooks/use-studio-access';
import { useSession } from '@/lib/session-provider';

export const Route = createFileRoute('/studios/$studioId/members/$memberId/')({
  component: StudioMemberProfileTab,
});

function StudioMemberProfileTab() {
  const { studioId, memberId } = Route.useParams();
  const { role } = useStudioAccess(studioId);
  const { session } = useSession();
  const { data: member } = useStudioMember(studioId, memberId);

  if (!member) {
    return null;
  }

  const canEdit = role === STUDIO_ROLE.ADMIN;
  const isSelf = session?.user?.email?.toLowerCase() === member.user_email.toLowerCase();

  return (
    <MemberProfileForm
      key={`${member.membership_id}:${member.role}:${member.base_hourly_rate ?? 'none'}`}
      studioId={studioId}
      member={member}
      isSelf={isSelf}
      canEdit={canEdit}
    />
  );
}
