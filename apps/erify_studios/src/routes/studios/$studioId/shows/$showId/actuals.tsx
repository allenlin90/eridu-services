import { createFileRoute } from '@tanstack/react-router';

import { STUDIO_ROLE } from '@eridu/api-types/memberships';

import { ShowActualsForm } from '@/features/studio-shows/components/show-actuals-form';
import { useStudioShow } from '@/features/studio-shows/hooks/use-studio-show';
import { useStudioAccess } from '@/lib/hooks/use-studio-access';

export const Route = createFileRoute('/studios/$studioId/shows/$showId/actuals')({
  component: StudioShowActualsTab,
});

function StudioShowActualsTab() {
  const { studioId, showId } = Route.useParams();
  const { data: show } = useStudioShow({ studioId, showId });
  const { role } = useStudioAccess(studioId);
  const isReadOnly = role === STUDIO_ROLE.ACCOUNT_MANAGER;

  if (!show) {
    return null;
  }

  return (
    <div className="rounded-md border bg-background p-3 sm:p-4">
      <ShowActualsForm
        key={`${show.id}:${show.actual_start_time ?? ''}:${show.actual_end_time ?? ''}`}
        studioId={studioId}
        show={show}
        isReadOnly={isReadOnly}
      />
    </div>
  );
}
