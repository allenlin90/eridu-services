import { createFileRoute, Outlet } from '@tanstack/react-router';
import { z } from 'zod';

import { StudioRouteGuard } from '@/components/guards/studio-route-guard';

const creatorMappingSearchSchema = z.looseObject({
  page: z.coerce.number().int().min(1).catch(1),
  limit: z.coerce.number().int().min(1).catch(10),
  sortBy: z.string().optional().catch(undefined),
  sortOrder: z.enum(['asc', 'desc']).optional().catch(undefined),
  search: z.string().optional().catch(undefined),
  date_from: z.string().optional().catch(undefined),
  date_to: z.string().optional().catch(undefined),
  has_creators: z.union([z.enum(['true', 'false']), z.boolean()]).optional().catch(undefined),
  creator_name: z.string().optional().catch(undefined),
  show_status_name: z.string().optional().catch(undefined),
});

export const Route = createFileRoute('/studios/$studioId/creator-mapping')({
  validateSearch: (search) => creatorMappingSearchSchema.parse(search),
  component: CreatorMappingLayout,
});

function CreatorMappingLayout() {
  const { studioId } = Route.useParams();

  return (
    <StudioRouteGuard
      studioId={studioId}
      routeKey="creatorMapping"
      deniedTitle="Creator Mapping Access Required"
      deniedDescription="Only studio admins, managers, and talent managers can access creator mapping."
    >
      <Outlet />
    </StudioRouteGuard>
  );
}
