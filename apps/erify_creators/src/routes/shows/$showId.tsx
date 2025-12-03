import { createFileRoute } from '@tanstack/react-router';

import { ShowDetailPage } from '@/pages/shows/show-detail-page';

export const Route = createFileRoute('/shows/$showId')({
  component: ShowDetailPageRoute,
});

function ShowDetailPageRoute() {
  const { showId } = Route.useParams();
  return <ShowDetailPage showId={showId} />;
}
