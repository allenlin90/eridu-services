import { createFileRoute, Link, Outlet } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';

import { Badge, Button } from '@eridu/ui';

import { PageLayout } from '@/components/layouts/page-layout';
import { useStudioCreatorRosterEntry } from '@/features/studio-creator-roster/api/studio-creator-roster';
import { useStudioAccess } from '@/lib/hooks/use-studio-access';

export const Route = createFileRoute('/studios/$studioId/creators/$creatorId')({
  component: StudioCreatorDetailLayout,
});

const TAB_LINK_CLASS = 'inline-flex items-center border-b-2 border-transparent px-1 pb-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground';
const TAB_LINK_ACTIVE_CLASS = 'border-primary text-foreground';

function BackToCreators({ studioId }: { studioId: string }) {
  return (
    <Button variant="outline" size="sm" asChild>
      <Link to="/studios/$studioId/creators" params={{ studioId }}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Creators
      </Link>
    </Button>
  );
}

function StudioCreatorDetailLayout() {
  const { studioId, creatorId } = Route.useParams();
  const { hasAccess } = useStudioAccess(studioId);
  const canViewCompensation = hasAccess('creatorCompensations');

  const { data: creator, isLoading, isError } = useStudioCreatorRosterEntry(studioId, creatorId);

  if (isLoading) {
    return (
      <PageLayout title="Creator" actions={<BackToCreators studioId={studioId} />}>
        <p className="rounded-md border p-3 text-sm text-muted-foreground">
          Loading creator...
        </p>
      </PageLayout>
    );
  }

  if (isError || !creator) {
    return (
      <PageLayout title="Creator" actions={<BackToCreators studioId={studioId} />}>
        <p className="rounded-md border p-3 text-sm text-destructive">
          Failed to load this creator. They may not be on the studio roster.
        </p>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title={creator.creator_name}
      description={creator.creator_alias_name || 'Studio creator defaults and compensation'}
      actions={(
        <div className="flex items-center gap-3">
          <Badge variant={creator.is_active ? 'secondary' : 'outline'}>
            {creator.is_active ? 'Active' : 'Inactive'}
          </Badge>
          <BackToCreators studioId={studioId} />
        </div>
      )}
    >
      <div className="space-y-4">
        <nav className="flex gap-6 border-b">
          <Link
            to="/studios/$studioId/creators/$creatorId"
            params={{ studioId, creatorId }}
            activeOptions={{ exact: true }}
            className={TAB_LINK_CLASS}
            activeProps={{ className: `${TAB_LINK_CLASS} ${TAB_LINK_ACTIVE_CLASS}` }}
          >
            Defaults
          </Link>
          {canViewCompensation && (
            <Link
              to="/studios/$studioId/creators/$creatorId/compensations"
              params={{ studioId, creatorId }}
              className={TAB_LINK_CLASS}
              activeProps={{ className: `${TAB_LINK_CLASS} ${TAB_LINK_ACTIVE_CLASS}` }}
            >
              Compensation
            </Link>
          )}
        </nav>

        <Outlet />
      </div>
    </PageLayout>
  );
}
