import { createFileRoute, Link } from '@tanstack/react-router';
import { format } from 'date-fns';
import { ArrowLeft } from 'lucide-react';
import { useMemo } from 'react';
import { z } from 'zod';

import { Button } from '@eridu/ui';

import { ShowContextPanel } from '@/features/studio-show-creators/components/show-context-panel';
import { ShowCreatorList } from '@/features/studio-show-creators/components/show-creator-list';
import type { StudioShowDetail } from '@/features/studio-shows/api/get-studio-show';
import { useStudioShow } from '@/features/studio-shows/hooks/use-studio-show';

const creatorMappingDetailSearchSchema = z.object({
  from: z.enum(['tasks', 'mapping']).optional().catch(undefined),
});

export const Route = createFileRoute('/studios/$studioId/creator-mapping/$showId')({
  validateSearch: (search) => creatorMappingDetailSearchSchema.parse(search),
  component: ShowCreatorMappingPage,
});

function buildShowSubtitle(showDetails: StudioShowDetail | undefined): string {
  if (!showDetails) {
    return 'Manage creators assigned to this show.';
  }

  return `${showDetails.client_name ?? 'No client'} • ${format(new Date(showDetails.start_time), 'PPP p')} - ${format(new Date(showDetails.end_time), 'p')}`;
}

function ShowCreatorMappingPage() {
  const { studioId, showId } = Route.useParams();
  const search = Route.useSearch();
  const { data: show, isLoading } = useStudioShow({ studioId, showId });
  const backToTasks = search.from === 'tasks';

  const showSubtitle = useMemo(() => buildShowSubtitle(show), [show]);

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-4">
            {backToTasks
              ? (
                  <Link to="/studios/$studioId/show-operations/$showId/tasks" params={{ studioId, showId }}>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                  </Link>
                )
              : (
                  <Link to="/studios/$studioId/creator-mapping" params={{ studioId }}>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                  </Link>
                )}
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight">
                {isLoading && !show ? 'Loading show...' : (show?.name ?? 'Creator Mapping')}
              </h1>
              <p className="text-sm text-muted-foreground">{showSubtitle}</p>
            </div>
          </div>
        </div>

        {show && <ShowContextPanel show={show} />}
      </div>

      {isLoading && !show
        ? (
            <p className="text-sm text-muted-foreground">Loading show details...</p>
          )
        : show
          ? (
              <ShowCreatorList
                studioId={studioId}
                showId={showId}
                showStartTime={show.start_time}
                showEndTime={show.end_time}
              />
            )
          : (
              <p className="text-sm text-muted-foreground">Show not found.</p>
            )}
    </div>
  );
}
