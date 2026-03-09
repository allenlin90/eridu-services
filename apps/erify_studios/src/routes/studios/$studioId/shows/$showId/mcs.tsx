import { createFileRoute, Navigate } from '@tanstack/react-router';
import { z } from 'zod';

const showMcsSearchSchema = z.object({
  from: z.enum(['shows', 'creators']).optional().catch(undefined),
});

export const Route = createFileRoute('/studios/$studioId/shows/$showId/mcs')({
  validateSearch: (search) => showMcsSearchSchema.parse(search),
  component: LegacyShowMcsRoute,
});

function LegacyShowMcsRoute() {
  const { studioId, showId } = Route.useParams();
  const search = Route.useSearch();

  return (
    <Navigate
      to="/studios/$studioId/shows/$showId/creators"
      params={{ studioId, showId }}
      search={search}
      replace
    />
  );
}
