import { createFileRoute } from '@tanstack/react-router';
import { useCallback, useMemo } from 'react';
import { z } from 'zod';

import { STUDIO_ROLE } from '@eridu/api-types/memberships';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@eridu/ui';

import { StudioShiftsCalendar } from '@/features/studio-shifts/components/studio-shifts-calendar';
import { StudioShiftsTable } from '@/features/studio-shifts/components/studio-shifts-table';
import {
  toCalendarViewSearch,
  toTableViewSearch,
} from '@/features/studio-shifts/utils/studio-shifts-route-search.utils';
import { useUserProfile } from '@/lib/hooks/use-user';

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
  component: StudioShiftsPage,
});

function StudioShiftsPage() {
  const { studioId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data: profile, isLoading: isLoadingProfile } = useUserProfile();

  const viewMode = search.view;

  const activeMembership = useMemo(
    () => profile?.studio_memberships?.find((membership) => membership.studio.uid === studioId),
    [profile?.studio_memberships, studioId],
  );
  const isStudioAdmin = activeMembership?.role === STUDIO_ROLE.ADMIN;

  const updateSearch = useCallback((
    updater: (previous: typeof search) => typeof search,
    options?: { replace?: boolean },
  ) => {
    void navigate({
      to: '/studios/$studioId/shifts',
      params: { studioId },
      search: updater,
      replace: options?.replace ?? true,
    });
  }, [navigate, studioId]);

  const handleToggleView = (mode: 'calendar' | 'table') => {
    updateSearch((prev) => {
      if (mode === 'calendar') {
        return toCalendarViewSearch();
      }
      return toTableViewSearch(prev);
    }, { replace: false });
  };

  if (isLoadingProfile) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Checking access...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isStudioAdmin) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <Card>
          <CardHeader>
            <CardTitle>Shift Management Access Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Only studio admins can access shift management.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Studio Shift Schedule</h1>
          <p className="text-muted-foreground">
            Manage all studio shifts with calendar and table views.
          </p>
        </div>

        <div className="inline-flex rounded-md border bg-background p-1 shrink-0">
          <Button
            size="sm"
            variant={viewMode === 'calendar' ? 'default' : 'ghost'}
            onClick={() => handleToggleView('calendar')}
          >
            Calendar
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'table' ? 'default' : 'ghost'}
            onClick={() => handleToggleView('table')}
          >
            Table
          </Button>
        </div>
      </div>

      {viewMode === 'calendar'
        ? (
            <StudioShiftsCalendar studioId={studioId} />
          )
        : (
            <StudioShiftsTable
              studioId={studioId}
              isStudioAdmin={isStudioAdmin}
              search={search}
              updateSearch={updateSearch}
            />
          )}
    </div>
  );
}
