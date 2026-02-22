import { Link, useParams } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { CheckCircle2, ChevronRight } from 'lucide-react';

import { Badge, Checkbox } from '@eridu/ui';

import type { StudioShow } from '../../api/get-studio-shows';

function ShowNameCell({ show }: { show: StudioShow }) {
  // Extract studioId from the current route context as a robust fallback
  // The 'strict: false' allows us to use this hook outside of a specific route declaration
  const { studioId: routeStudioId } = useParams({ strict: false }) as { studioId?: string };

  // Prefer the route context studioId, fallback to the show's studio_id if available somehow
  const actualStudioId = routeStudioId || (show.studio_id as string) || 'fallback';

  return (
    <div className="flex flex-col gap-1 pr-4">
      <Link
        to="/studios/$studioId/shows/$showId/tasks"
        params={{ studioId: actualStudioId, showId: show.id }}
        className="font-medium hover:underline flex items-center gap-1"
      >
        {show.name}
        <ChevronRight className="h-3 w-3 text-muted-foreground" />
      </Link>
      {show.client_name
        ? (
            <span className="text-xs text-muted-foreground">{show.client_name}</span>
          )
        : (
            <span className="text-xs text-muted-foreground italic">No Client</span>
          )}
    </div>
  );
}

export const columns: ColumnDef<StudioShow>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected()
          || table.getIsSomePageRowsSelected()
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
    size: 40,
  },
  {
    accessorKey: 'name',
    header: 'Show Name',
    cell: ({ row }) => <ShowNameCell show={row.original} />,
  },
  {
    accessorKey: 'start_time',
    header: 'Start Time',
    cell: ({ row }) => {
      const startTime = row.getValue<string>('start_time');
      const endTime = row.original.end_time;
      if (!startTime)
        return <span className="text-muted-foreground">-</span>;

      return (
        <div className="flex flex-col gap-1">
          <span className="text-sm">{format(new Date(startTime), 'MMM d, yyyy')}</span>
          <span className="text-xs text-muted-foreground">
            {format(new Date(startTime), 'h:mm a')}
            {endTime && ` - ${format(new Date(endTime), 'h:mm a')}`}
          </span>
        </div>
      );
    },
  },
  {
    id: 'task_status',
    header: 'Task Status',
    cell: ({ row }) => {
      const summary = row.original.task_summary;

      if (summary.total === 0) {
        return <Badge variant="secondary" className="bg-slate-100 text-slate-500 font-normal">No tasks</Badge>;
      }

      if (summary.total === summary.completed) {
        return (
          <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700 font-normal shadow-sm">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {summary.total}
            {' '}
            tasks
          </Badge>
        );
      }

      if (summary.unassigned > 0) {
        return (
          <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 font-normal shadow-sm hover:cursor-help" title={`${summary.unassigned} tasks unassigned`}>
            {summary.total}
            {' '}
            tasks
            <span className="text-amber-600/70 ml-1">
              (
              {summary.unassigned}
              {' '}
              unassigned)
            </span>
          </Badge>
        );
      }

      return (
        <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700 font-normal shadow-sm">
          {summary.total}
          {' '}
          tasks
        </Badge>
      );
    },
  },
  {
    id: 'assignee',
    header: 'Assignee',
    cell: ({ row }) => {
      const summary = row.original.task_summary;
      if (summary.total === 0) {
        return <span className="text-xs text-muted-foreground">—</span>;
      }
      if (summary.assigned === 0) {
        return <span className="text-xs text-muted-foreground italic">Unassigned</span>;
      }
      if (summary.unassigned > 0 && summary.assigned > 0) {
        return <span className="text-xs text-muted-foreground">Mixed</span>;
      }
      return <span className="text-xs">Assigned</span>;
    },
  },
];
