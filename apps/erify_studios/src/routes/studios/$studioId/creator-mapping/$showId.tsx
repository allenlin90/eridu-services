import { createFileRoute, Link } from '@tanstack/react-router';
import { format } from 'date-fns';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import { useMemo, useState } from 'react';
import { z } from 'zod';

import { Badge, Button } from '@eridu/ui';

import { ShowCreatorList } from '@/features/studio-show-creators/components/show-creator-list';
import type { StudioShowDetail } from '@/features/studio-shows/api/get-studio-show';
import { useStudioShow } from '@/features/studio-shows/hooks/use-studio-show';

type ShowMetaItem = {
  label: string;
  value: string;
};

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

function buildShowMetaItems(showDetails: StudioShowDetail | null): ShowMetaItem[] {
  if (!showDetails) {
    return [];
  }

  return [
    { label: 'Show ID', value: showDetails.id },
    { label: 'Studio', value: showDetails.studio_name ?? '—' },
    { label: 'Room', value: showDetails.studio_room_name ?? '—' },
    { label: 'Type', value: showDetails.show_type_name ?? '—' },
    { label: 'Standard', value: showDetails.show_standard_name ?? '—' },
  ];
}

function ShowCreatorMappingPage() {
  const { studioId, showId } = Route.useParams();
  const search = Route.useSearch();
  const { data: show, isLoading } = useStudioShow({ studioId, showId });
  const [isShowDetailsOpen, setIsShowDetailsOpen] = useState(false);
  const backToTasks = search.from === 'tasks';

  const showSubtitle = useMemo(() => buildShowSubtitle(show), [show]);
  const showMetaItems = useMemo(() => buildShowMetaItems(show ?? null), [show]);

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-4">
            {backToTasks
              ? (
                  <Link to="/studios/$studioId/shows/$showId/tasks" params={{ studioId, showId }}>
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

        {show && (
          <div className="rounded-md border bg-muted/20 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-muted-foreground">Show Details</p>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setIsShowDetailsOpen((previous) => !previous)}
              >
                {isShowDetailsOpen ? 'Hide' : 'Show'}
                <ChevronDown className={`ml-1 h-3.5 w-3.5 transition-transform ${isShowDetailsOpen ? 'rotate-180' : ''}`} />
              </Button>
            </div>

            {isShowDetailsOpen && (
              <>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {show.show_status_name && (
                    <Badge variant="outline" className="capitalize">
                      {show.show_status_name}
                    </Badge>
                  )}
                  {show.show_type_name && (
                    <Badge variant="secondary" className="capitalize">
                      {show.show_type_name}
                    </Badge>
                  )}
                  {show.show_standard_name && (
                    <Badge variant="outline" className="capitalize">
                      {show.show_standard_name}
                    </Badge>
                  )}
                </div>

                <dl className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2 lg:grid-cols-5">
                  {showMetaItems.map((item) => (
                    <div key={item.label} className="rounded border bg-background px-2 py-1.5">
                      <dt className="text-muted-foreground">{item.label}</dt>
                      <dd className="truncate font-medium" title={item.value}>
                        {item.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </>
            )}
          </div>
        )}
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
