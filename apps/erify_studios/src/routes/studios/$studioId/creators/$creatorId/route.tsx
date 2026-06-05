import { createFileRoute, Link, Outlet } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';

import type { StudioCreatorRosterItem } from '@eridu/api-types/studio-creators';
import { Badge, Button } from '@eridu/ui';

import { useStudioCreatorRosterEntry } from '@/features/studio-creator-roster/api/studio-creator-roster';
import { STUDIO_CREATOR_COMPENSATION_TYPE_OPTIONS } from '@/features/studio-creator-roster/lib/studio-creator-compensation';
import { toDecimalDisplayString } from '@/lib/decimal-format';
import { useStudioAccess } from '@/lib/hooks/use-studio-access';

export const Route = createFileRoute('/studios/$studioId/creators/$creatorId')({
  component: StudioCreatorDetailLayout,
});

const TAB_LINK_CLASS = 'inline-flex items-center border-b-2 border-transparent px-1 pb-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground';
const TAB_LINK_ACTIVE_CLASS = 'border-primary text-foreground';

function BackToCreators({ studioId }: { studioId: string }) {
  return (
    <Button asChild variant="ghost" size="icon" className="h-8 w-8" aria-label="Back to creators">
      <Link to="/studios/$studioId/creators" params={{ studioId }}>
        <ArrowLeft className="h-4 w-4" />
      </Link>
    </Button>
  );
}

function formatCreatorRate(creator: Pick<StudioCreatorRosterItem, 'default_rate' | 'default_rate_type'>) {
  if (!creator.default_rate) {
    return 'No default rate set';
  }

  const typeLabel = STUDIO_CREATOR_COMPENSATION_TYPE_OPTIONS.find(
    (option) => option.value === creator.default_rate_type,
  )?.label;

  return typeLabel
    ? `$${toDecimalDisplayString(creator.default_rate)} · ${typeLabel}`
    : `$${toDecimalDisplayString(creator.default_rate)}`;
}

function CreatorHeader({
  studioId,
  creator,
  isLoading,
}: {
  studioId: string;
  creator?: Pick<
    StudioCreatorRosterItem,
    'creator_name' | 'creator_alias_name' | 'is_active' | 'default_rate' | 'default_rate_type'
  >;
  isLoading: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="flex min-w-0 items-center gap-4">
        <BackToCreators studioId={studioId} />
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold tracking-tight">
            {isLoading && !creator ? 'Loading creator...' : (creator?.creator_name ?? 'Creator')}
          </h1>
          <p className="truncate text-sm text-muted-foreground">
            {creator?.creator_alias_name || 'Studio creator profile and compensation'}
          </p>
        </div>
      </div>

      {creator
        ? (
            <div className="rounded-md border bg-muted/20 p-3">
              <p className="text-xs font-medium text-muted-foreground">Creator Profile</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge variant={creator.is_active ? 'secondary' : 'outline'}>
                  {creator.is_active ? 'Active' : 'Inactive'}
                </Badge>
                <Badge variant="outline">
                  {formatCreatorRate(creator)}
                </Badge>
              </div>
            </div>
          )
        : null}
    </div>
  );
}

function StudioCreatorDetailLayout() {
  const { studioId, creatorId } = Route.useParams();
  const { hasAccess } = useStudioAccess(studioId);
  const canViewCompensation = hasAccess('creatorCompensations');

  const { data: creator, isLoading, isError } = useStudioCreatorRosterEntry(studioId, creatorId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <CreatorHeader studioId={studioId} isLoading={isLoading} />
        <p className="rounded-md border p-3 text-sm text-muted-foreground">
          Loading creator...
        </p>
      </div>
    );
  }

  if (isError || !creator) {
    return (
      <div className="space-y-4">
        <CreatorHeader studioId={studioId} isLoading={false} />
        <p className="rounded-md border p-3 text-sm text-destructive">
          Failed to load this creator. They may not be on the studio roster.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <CreatorHeader studioId={studioId} creator={creator} isLoading={isLoading} />

      <div className="space-y-4">
        <nav className="flex gap-6 border-b">
          <Link
            to="/studios/$studioId/creators/$creatorId"
            params={{ studioId, creatorId }}
            activeOptions={{ exact: true }}
            className={TAB_LINK_CLASS}
            activeProps={{ className: `${TAB_LINK_CLASS} ${TAB_LINK_ACTIVE_CLASS}` }}
          >
            Profile
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
    </div>
  );
}
