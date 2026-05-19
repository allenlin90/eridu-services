import { format, isSameDay } from 'date-fns';
import { useId } from 'react';

import { Badge } from '@eridu/ui';

import type { StudioShowDetail } from '@/features/studio-shows/api/get-studio-show';

type DetailItem = {
  label: string;
  value: string;
  title?: string;
};

type ShowContextPanelProps = {
  show: StudioShowDetail;
};

function formatDateTimeRange(startTime: string, endTime: string): string {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const endFormat = isSameDay(start, end) ? 'p' : 'PPP p';

  return `${format(start, 'PPP p')} - ${format(end, endFormat)}`;
}

function formatActualsRange(show: StudioShowDetail): string {
  if (!show.actual_start_time && !show.actual_end_time) {
    return 'Not recorded';
  }

  if (!show.actual_start_time || !show.actual_end_time) {
    return 'Partially recorded';
  }

  return formatDateTimeRange(show.actual_start_time, show.actual_end_time);
}

function buildDetailItems(show: StudioShowDetail): DetailItem[] {
  return [
    { label: 'Client', value: show.client_name ?? 'No client' },
    { label: 'Scheduled', value: formatDateTimeRange(show.start_time, show.end_time) },
    { label: 'Actuals', value: formatActualsRange(show) },
    { label: 'Studio', value: show.studio_name ?? '-' },
    { label: 'Room', value: show.studio_room_name ?? '-' },
    { label: 'Show UID', value: show.id },
  ];
}

export function ShowContextPanel({ show }: ShowContextPanelProps) {
  const headingId = useId();
  const detailItems = buildDetailItems(show);
  const platformNames = show.platforms.map((platform) => platform.name);

  return (
    <section className="rounded-md border bg-background p-3 sm:p-4" aria-labelledby={headingId}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 id={headingId} className="text-sm font-semibold">
          Show context
        </h2>

        <div className="flex flex-wrap items-center gap-2">
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
      </div>

      <dl className="mt-4 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded border bg-muted/20 px-2 py-1.5">
          <dt className="text-muted-foreground">Platforms</dt>
          <dd className="mt-1 flex min-h-5 flex-wrap gap-1 font-medium">
            {platformNames.length > 0
              ? platformNames.map((platformName) => (
                  <Badge key={platformName} variant="outline" className="max-w-full truncate text-[10px]">
                    {platformName}
                  </Badge>
                ))
              : <span>No platform</span>}
          </dd>
        </div>
        {detailItems.map((item) => (
          <div key={item.label} className="rounded border bg-muted/20 px-2 py-1.5">
            <dt className="text-muted-foreground">{item.label}</dt>
            <dd className="truncate font-medium" title={item.title ?? item.value}>
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
