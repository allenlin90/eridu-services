import { Link } from '@tanstack/react-router';
import { format } from 'date-fns';
import { ArrowLeft } from 'lucide-react';

import { Badge, Button } from '@eridu/ui';

import type { StudioShowDetail } from '../api/get-studio-show';

type ShowDetailHeaderProps = {
  studioId: string;
  show?: StudioShowDetail;
  isLoading: boolean;
};

function buildShowSubtitle(show: StudioShowDetail): string {
  const client = show.client_name ?? 'No client';
  const window = `${format(new Date(show.start_time), 'PPP p')} - ${format(new Date(show.end_time), 'p')}`;
  return `${client} • ${window}`;
}

export function ShowDetailHeader({
  studioId,
  show,
  isLoading,
}: ShowDetailHeaderProps) {
  return (
    <div className="space-y-3">
      <div className="flex min-w-0 items-center gap-4">
        <Button asChild variant="ghost" size="icon" className="h-8 w-8" aria-label="Back to shows">
          <Link to="/studios/$studioId/shows" params={{ studioId }}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold tracking-tight">
            {isLoading && !show ? 'Loading show...' : (show?.name ?? 'Show')}
          </h1>
          <p className="truncate text-sm text-muted-foreground">
            {show ? buildShowSubtitle(show) : 'Studio show details, actuals, and compensation'}
          </p>
        </div>
      </div>

      {show
        ? (
            <div className="rounded-md border bg-muted/20 p-3">
              <p className="text-xs font-medium text-muted-foreground">Show Details</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {show.show_status_name
                  ? <Badge variant="outline">{show.show_status_name}</Badge>
                  : null}
                <Badge variant="outline">{show.client_name ?? 'No client'}</Badge>
                {show.schedule_name
                  ? <Badge variant="outline">{show.schedule_name}</Badge>
                  : null}
                {show.studio_room_name
                  ? <Badge variant="outline">{show.studio_room_name}</Badge>
                  : null}
                <Badge variant={show.actual_start_time ? 'secondary' : 'outline'}>
                  {show.actual_start_time ? 'Actual recorded' : 'Actual pending'}
                </Badge>
              </div>
            </div>
          )
        : null}
    </div>
  );
}
