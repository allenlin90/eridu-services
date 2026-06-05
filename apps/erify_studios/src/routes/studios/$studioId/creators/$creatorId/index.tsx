import { createFileRoute } from '@tanstack/react-router';

import { STUDIO_ROLE } from '@eridu/api-types/memberships';

import { useStudioCreatorRosterEntry } from '@/features/studio-creator-roster/api/studio-creator-roster';
import { CreatorDefaultsForm } from '@/features/studio-creator-roster/components/creator-defaults-form';
import { useStudioAccess } from '@/lib/hooks/use-studio-access';

export const Route = createFileRoute('/studios/$studioId/creators/$creatorId/')({
  component: StudioCreatorDefaultsTab,
});

function StudioCreatorDefaultsTab() {
  const { studioId, creatorId } = Route.useParams();
  const { role } = useStudioAccess(studioId);
  const { data: creator } = useStudioCreatorRosterEntry(studioId, creatorId);

  if (!creator) {
    return null;
  }

  const canEdit = role === STUDIO_ROLE.ADMIN || role === STUDIO_ROLE.MANAGER;

  return (
    <CreatorDefaultsForm
      key={`${creator.id}:${creator.version}`}
      studioId={studioId}
      creator={creator}
      canEdit={canEdit}
    />
  );
}
