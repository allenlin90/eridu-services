import { createFileRoute, Link, Outlet } from '@tanstack/react-router';

import { STUDIO_ROLE } from '@eridu/api-types/memberships';

import { ShowDetailHeader } from '@/features/studio-shows/components/show-detail-header';
import { useStudioShow } from '@/features/studio-shows/hooks/use-studio-show';
import { useStudioAccess } from '@/lib/hooks/use-studio-access';

export const Route = createFileRoute('/studios/$studioId/shows/$showId')({
  component: StudioShowDetailLayout,
});

const TAB_LINK_CLASS = 'inline-flex items-center shrink-0 border-b-2 border-transparent px-1 pb-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground';
const TAB_LINK_ACTIVE_CLASS = 'border-primary text-foreground';

function StudioShowDetailLayout() {
  const { studioId, showId } = Route.useParams();
  const { data: show, isLoading, isError } = useStudioShow({ studioId, showId });
  const { role, hasAccess } = useStudioAccess(studioId);

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

  const isAM = role === STUDIO_ROLE.ACCOUNT_MANAGER;

  return (
    <div className="space-y-4">
      <ShowDetailHeader studioId={studioId} show={show} isLoading={isLoading} />

      <div className="space-y-4">
        <nav className="flex gap-6 border-b overflow-x-auto scrollbar-none flex-nowrap scroll-smooth -mx-4 px-4 sm:mx-0 sm:px-0">
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
          {!isAM && (
            <Link
              to="/studios/$studioId/shows/$showId/performance"
              params={{ studioId, showId }}
              className={TAB_LINK_CLASS}
              activeProps={{ className: `${TAB_LINK_CLASS} ${TAB_LINK_ACTIVE_CLASS}` }}
            >
              Performance
            </Link>
          )}
          {!isAM && (
            <Link
              to="/studios/$studioId/shows/$showId/compensation"
              params={{ studioId, showId }}
              className={TAB_LINK_CLASS}
              activeProps={{ className: `${TAB_LINK_CLASS} ${TAB_LINK_ACTIVE_CLASS}` }}
            >
              Compensation
            </Link>
          )}
          {(role === STUDIO_ROLE.ADMIN || role === STUDIO_ROLE.MANAGER || role === STUDIO_ROLE.ACCOUNT_MANAGER) && (
            <Link
              to="/studios/$studioId/shows/$showId/mechanics"
              params={{ studioId, showId }}
              search={{ page: 1, limit: 10 }}
              className={TAB_LINK_CLASS}
              activeProps={{ className: `${TAB_LINK_CLASS} ${TAB_LINK_ACTIVE_CLASS}` }}
            >
              Client Cues
            </Link>
          )}
          {!isAM && (
            <Link
              to="/studios/$studioId/shows/$showId/tasks"
              params={{ studioId, showId }}
              className={TAB_LINK_CLASS}
              activeProps={{ className: `${TAB_LINK_CLASS} ${TAB_LINK_ACTIVE_CLASS}` }}
            >
              Submitted Tasks
            </Link>
          )}
          {hasAccess('schedulePublishImpacts') && (
            <Link
              to="/studios/$studioId/shows/$showId/audits"
              params={{ studioId, showId }}
              search={{ page: 1 }}
              className={TAB_LINK_CLASS}
              activeProps={{ className: `${TAB_LINK_CLASS} ${TAB_LINK_ACTIVE_CLASS}` }}
            >
              Publish Audit
            </Link>
          )}
        </nav>

        <Outlet />
      </div>
    </div>
  );
}
