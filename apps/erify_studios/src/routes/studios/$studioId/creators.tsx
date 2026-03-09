import { createFileRoute, Outlet } from '@tanstack/react-router';
import { z } from 'zod';

import { StudioRouteGuard } from '@/components/guards/studio-route-guard';

const creatorsSearchSchema = z.looseObject({
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(1).catch(10),
  search: z.string().optional().catch(undefined),
  date_from: z.string().optional().catch(undefined),
  date_to: z.string().optional().catch(undefined),
});

export const Route = createFileRoute('/studios/$studioId/creators')({
  validateSearch: (search) => creatorsSearchSchema.parse(search),
  component: StudioCreatorsLayout,
});

function StudioCreatorsLayout() {
  const { studioId } = Route.useParams();

  return (
    <StudioRouteGuard
      studioId={studioId}
      routeKey="creators"
      deniedTitle="Creator Access Required"
      deniedDescription="Only studio admins, managers, and talent managers can access creator operations."
    >
      <Outlet />
    </StudioRouteGuard>
  );
}
