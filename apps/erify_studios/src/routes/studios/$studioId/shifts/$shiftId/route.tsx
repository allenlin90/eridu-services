import { createFileRoute, Link, Outlet } from '@tanstack/react-router';

import { ShiftDetailHeader } from '@/features/studio-shifts/components/shift-detail-header';
import { useStudioShift } from '@/features/studio-shifts/hooks/use-studio-shifts';

export const Route = createFileRoute('/studios/$studioId/shifts/$shiftId')({
  component: StudioShiftDetailLayout,
});

const TAB_LINK_CLASS = 'inline-flex items-center border-b-2 border-transparent px-1 pb-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground';
const TAB_LINK_ACTIVE_CLASS = 'border-primary text-foreground';

function StudioShiftDetailLayout() {
  const { studioId, shiftId } = Route.useParams();
  const { data: shift, isLoading, isError } = useStudioShift(studioId, shiftId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <ShiftDetailHeader studioId={studioId} isLoading />
        <p className="rounded-md border p-3 text-sm text-muted-foreground">
          Loading shift...
        </p>
      </div>
    );
  }

  if (isError || !shift) {
    return (
      <div className="space-y-4">
        <ShiftDetailHeader studioId={studioId} isLoading={false} />
        <p className="rounded-md border p-3 text-sm text-destructive">
          Failed to load this shift. It may not belong to this studio.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ShiftDetailHeader studioId={studioId} shift={shift} isLoading={isLoading} />

      <div className="space-y-4">
        <nav className="flex gap-6 border-b">
          <Link
            to="/studios/$studioId/shifts/$shiftId"
            params={{ studioId, shiftId }}
            search={{ view: 'calendar', page: 1, limit: 20 }}
            activeOptions={{ exact: true }}
            className={TAB_LINK_CLASS}
            activeProps={{ className: `${TAB_LINK_CLASS} ${TAB_LINK_ACTIVE_CLASS}` }}
          >
            Profile
          </Link>
          <Link
            to="/studios/$studioId/shifts/$shiftId/compensation"
            params={{ studioId, shiftId }}
            search={{ view: 'calendar', page: 1, limit: 20 }}
            className={TAB_LINK_CLASS}
            activeProps={{ className: `${TAB_LINK_CLASS} ${TAB_LINK_ACTIVE_CLASS}` }}
          >
            Compensation
          </Link>
        </nav>

        <Outlet />
      </div>
    </div>
  );
}
