import { createFileRoute, Link, Outlet } from '@tanstack/react-router';

import { ShowDetailHeader } from '@/features/studio-shows/components/show-detail-header';
import { useStudioShow } from '@/features/studio-shows/hooks/use-studio-show';

export const Route = createFileRoute('/studios/$studioId/shows/$showId')({
  component: StudioShowDetailLayout,
});

const TAB_LINK_CLASS = 'inline-flex items-center border-b-2 border-transparent px-1 pb-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground';
const TAB_LINK_ACTIVE_CLASS = 'border-primary text-foreground';

function StudioShowDetailLayout() {
  const { studioId, showId } = Route.useParams();
  const { data: show, isLoading, isError } = useStudioShow({ studioId, showId });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <ShowDetailHeader studioId={studioId} isLoading />
        <p className="rounded-md border p-3 text-sm text-muted-foreground">
          Loading show...
        </p>
      </div>
    );
  }

  if (isError || !show) {
    return (
      <div className="space-y-4">
        <ShowDetailHeader studioId={studioId} isLoading={false} />
        <p className="rounded-md border p-3 text-sm text-destructive">
          Failed to load this show. It may not belong to this studio.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ShowDetailHeader studioId={studioId} show={show} isLoading={isLoading} />

      <div className="space-y-4">
        <nav className="flex gap-6 border-b">
          <Link
            to="/studios/$studioId/shows/$showId"
            params={{ studioId, showId }}
            activeOptions={{ exact: true }}
            className={TAB_LINK_CLASS}
            activeProps={{ className: `${TAB_LINK_CLASS} ${TAB_LINK_ACTIVE_CLASS}` }}
          >
            Details
          </Link>
          <Link
            to="/studios/$studioId/shows/$showId/actuals"
            params={{ studioId, showId }}
            className={TAB_LINK_CLASS}
            activeProps={{ className: `${TAB_LINK_CLASS} ${TAB_LINK_ACTIVE_CLASS}` }}
          >
            Actuals
          </Link>
          <Link
            to="/studios/$studioId/shows/$showId/compensation"
            params={{ studioId, showId }}
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
