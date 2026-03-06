import { createFileRoute, Outlet } from '@tanstack/react-router';
import { z } from 'zod';

import { StudioRouteGuard } from '@/components/guards/studio-route-guard';

const shiftsSearchSchema = z.object({
  view: z.enum(['calendar', 'table']).catch('calendar'),
  page: z.coerce.number().int().min(1).catch(1),
  limit: z.coerce.number().int().min(10).max(100).catch(20),
  user_id: z.string().optional().catch(undefined),
  status: z.enum(['SCHEDULED', 'COMPLETED', 'CANCELLED']).optional().catch(undefined),
  duty: z.enum(['true', 'false']).optional().catch(undefined),
  date_from: z.string().optional().catch(undefined),
  date_to: z.string().optional().catch(undefined),
});

export const Route = createFileRoute('/studios/$studioId/shifts')({
  validateSearch: (search) => shiftsSearchSchema.parse(search),
  component: StudioShiftsLayout,
});

function StudioShiftsLayout() {
  const { studioId } = Route.useParams();

  return (
    <StudioRouteGuard
      studioId={studioId}
      routeKey="shifts"
      deniedTitle="Shift Management Access Required"
      deniedDescription="Only studio admins can access shift management."
    >
      <Outlet />
    </StudioRouteGuard>
  );
}
