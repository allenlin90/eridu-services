/* eslint-disable react-refresh/only-export-components */
import { Link, useParams } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { ChevronRight } from 'lucide-react';

import { Badge, Checkbox } from '@eridu/ui';

import type { StudioShow } from '@/features/studio-shows/api/get-studio-shows';

function ShowNameCell({ show }: { show: StudioShow }) {
  const { studioId: routeStudioId } = useParams({ strict: false }) as { studioId?: string };
  const studioId = routeStudioId ?? show.studio_id ?? '';

  return (
    <div className="flex min-w-0 flex-col gap-1 pr-4">
      <Link
        to="/studios/$studioId/creator-mapping/$showId"
        params={{ studioId, showId: show.id }}
        search={{ from: 'mapping' }}
        className="flex items-center gap-1 font-medium hover:underline"
      >
        <span className="truncate" title={show.name}>{show.name}</span>
        <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
      </Link>
      <span className="truncate text-xs text-muted-foreground" title={show.client_name ?? undefined}>
        {show.client_name ?? 'No client'}
      </span>
    </div>
  );
}

function StatusCell({ show }: { show: StudioShow }) {
  if (!show.show_status_name) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  return (
    <Badge variant="outline" className="w-fit text-[10px] capitalize">
      {show.show_status_name}
    </Badge>
  );
}

function ScheduleCell({ show }: { show: StudioShow }) {
  if (!show.start_time) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  return (
    <div className="flex flex-col gap-1 text-xs">
      <span>{format(new Date(show.start_time), 'MMM d, yyyy')}</span>
      <span className="text-muted-foreground">
        {format(new Date(show.start_time), 'h:mm a')}
        {show.end_time ? ` - ${format(new Date(show.end_time), 'h:mm a')}` : ''}
      </span>
    </div>
  );
}

function CreatorMappingCell({ show }: { show: StudioShow }) {
  const mappedCreatorCount = show.creators?.length ?? 0;

  if (mappedCreatorCount === 0) {
    return (
      <div className="flex flex-col gap-1">
        <Badge variant="secondary" className="w-fit text-[10px]">Unmapped</Badge>
        <span className="text-xs text-muted-foreground">No creators assigned</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <Badge variant="outline" className="w-fit text-[10px]">
        {mappedCreatorCount}
        {' '}
        creator
        {mappedCreatorCount > 1 ? 's' : ''}
      </Badge>
      <span className="hidden text-xs text-muted-foreground md:block" title={show.creators.map((creator) => creator.creator_name).join(', ')}>
        {show.creators.map((creator) => creator.creator_name).join(', ')}
      </span>
    </div>
  );
}

export const creatorMappingShowColumns: ColumnDef<StudioShow>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected()
          || table.getIsSomePageRowsSelected()
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all shows"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select show"
      />
    ),
    enableSorting: false,
    enableHiding: false,
    size: 40,
  },
  {
    accessorKey: 'name',
    header: 'Show',
    cell: ({ row }) => <ShowNameCell show={row.original} />,
  },
  {
    accessorKey: 'show_status_name',
    header: 'Status',
    cell: ({ row }) => <StatusCell show={row.original} />,
    meta: { className: 'hidden sm:table-cell' },
  },
  {
    accessorKey: 'start_time',
    header: 'Schedule',
    cell: ({ row }) => <ScheduleCell show={row.original} />,
    meta: { className: 'hidden md:table-cell' },
  },
  {
    id: 'creator_mapping_status',
    header: 'Creator Mapping',
    cell: ({ row }) => <CreatorMappingCell show={row.original} />,
  },
  {
    id: 'creator_name',
    accessorFn: (row) => row.creators.map((creator) => creator.creator_name).join(', '),
    header: () => null,
    cell: () => null,
    meta: { className: 'hidden' },
  },
  {
    id: 'has_creators',
    accessorFn: (row) => String((row.creators?.length ?? 0) > 0),
    header: () => null,
    cell: () => null,
    meta: { className: 'hidden' },
  },
];
