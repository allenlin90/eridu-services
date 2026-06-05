import { createFileRoute } from '@tanstack/react-router';

import { ShowActualsForm } from '@/features/studio-shows/components/show-actuals-form';
import { useStudioShow } from '@/features/studio-shows/hooks/use-studio-show';

export const Route = createFileRoute('/studios/$studioId/shows/$showId/actuals')({
  component: StudioShowActualsTab,
});

function StudioShowActualsTab() {
  const { studioId, showId } = Route.useParams();
  const { data: show } = useStudioShow({ studioId, showId });

  if (!show) {
    return null;
  }

  return (
    <div className="rounded-md border bg-background p-3 sm:p-4">
      <ShowActualsForm
        key={`${show.id}:${show.actual_start_time ?? ''}:${show.actual_end_time ?? ''}`}
        studioId={studioId}
        show={show}
      />
    </div>
  );
}
