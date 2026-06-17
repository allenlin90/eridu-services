import { createFileRoute } from '@tanstack/react-router';

import { StudioRouteGuard } from '@/components/guards/studio-route-guard';
import { ShowCreatorList } from '@/features/studio-show-creators/components/show-creator-list';
import { useStudioShow } from '@/features/studio-shows/hooks/use-studio-show';

export const Route = createFileRoute('/studios/$studioId/shows/$showId/compensation')({
  component: () => (
    <StudioRouteGuard routeKey="creatorCompensations">
      <StudioShowCompensationTab />
    </StudioRouteGuard>
  ),
});

function StudioShowCompensationTab() {
  const { studioId, showId } = Route.useParams();
  const { data: show } = useStudioShow({ studioId, showId });

  if (!show) {
    return null;
  }

  return (
    <ShowCreatorList
      studioId={studioId}
      showId={showId}
      showStartTime={show.start_time}
      showEndTime={show.end_time}
    />
  );
}
