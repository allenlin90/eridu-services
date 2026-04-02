import { createFileRoute, Outlet } from '@tanstack/react-router';
import { z } from 'zod';

import { StudioRouteGuard } from '@/components/guards/studio-route-guard';

const studioShowsSearchSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  limit: z.coerce.number().int().min(1).catch(10),
  sortBy: z.string().optional().catch(undefined),
  sortOrder: z.enum(['asc', 'desc']).optional().catch(undefined),
  search: z.string().optional().catch(undefined),
  date_from: z.string().optional().catch(undefined),
  date_to: z.string().optional().catch(undefined),
  client_name: z.string().optional().catch(undefined),
  creator_name: z.string().optional().catch(undefined),
  show_type_name: z.string().optional().catch(undefined),
  show_standard_name: z.string().optional().catch(undefined),
  show_status_name: z.string().optional().catch(undefined),
  platform_name: z.string().optional().catch(undefined),
});

export const Route = createFileRoute('/studios/$studioId/shows')({
  validateSearch: (search) => studioShowsSearchSchema.parse(search),
  component: StudioShowsRoute,
});

function StudioShowsRoute() {
  const { studioId } = Route.useParams();

  return (
    <StudioRouteGuard
      studioId={studioId}
      routeKey="shows"
      deniedTitle="Show Access Required"
      deniedDescription="Only studio admins and managers can access studio show management."
    >
      <Outlet />
    </StudioRouteGuard>
  );
}
