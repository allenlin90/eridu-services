import { createFileRoute, Outlet } from '@tanstack/react-router';
import { z } from 'zod';

import { StudioRouteGuard } from '@/components/guards/studio-route-guard';

const showsSearchSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(1).catch(10),
  sortBy: z.string().optional().catch(undefined),
  sortOrder: z.enum(['asc', 'desc']).optional().catch(undefined),
  search: z.string().optional().catch(undefined),
  date_from: z.string().optional().catch(undefined),
  date_to: z.string().optional().catch(undefined),
  has_tasks: z.union([z.enum(['true', 'false']), z.boolean()]).optional().catch(undefined),
  client_name: z.string().optional().catch(undefined),
  show_type_name: z.string().optional().catch(undefined),
  show_standard_name: z.string().optional().catch(undefined),
  show_status_name: z.string().optional().catch(undefined),
  platform_name: z.string().optional().catch(undefined),
}).passthrough();

export const Route = createFileRoute('/studios/$studioId/shows')({
  validateSearch: (search) => showsSearchSchema.parse(search),
  component: RouteComponent,
});

function RouteComponent() {
  const { studioId } = Route.useParams();

  return (
    <StudioRouteGuard
      studioId={studioId}
      routeKey="shows"
      deniedTitle="Shows Access Required"
      deniedDescription="Only studio admins can access shows management."
    >
      <Outlet />
    </StudioRouteGuard>
  );
}
