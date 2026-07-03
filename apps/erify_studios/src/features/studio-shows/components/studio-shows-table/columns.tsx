/* eslint-disable react-refresh/only-export-components */
import type { HistoryState } from '@tanstack/react-router';
import { Link, useParams } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { CheckCircle2, ChevronRight, Clock3, FileQuestion, UserMinus } from 'lucide-react';

import { Badge, Checkbox, DataTableActions, DropdownMenuItem } from '@eridu/ui';

import type { StudioShow } from '../../api/get-studio-shows';
import { getShowActualsStatus, toShowActualsServerFilter } from '../../utils/show-actuals.utils';

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
        search={{ page: 1, limit: 10 }}
        state={{
          show: {
            id: show.id,
            name: show.name,
            client_id: show.client_id,
            client_name: show.client_name,
            studio_id: show.studio_id,
            studio_name: show.studio_name,
            studio_room_id: show.studio_room_id,
            studio_room_name: show.studio_room_name,
            show_type_id: show.show_type_id,
            show_type_name: show.show_type_name,
            show_status_id: show.show_status_id,
            show_status_name: show.show_status_name,
            show_standard_id: show.show_standard_id,
            show_standard_name: show.show_standard_name,
            start_time: show.start_time,
            end_time: show.end_time,
            actual_start_time: show.actual_start_time,
            actual_end_time: show.actual_end_time,
            metadata: show.metadata,
            created_at: show.created_at,
            updated_at: show.updated_at,
          },
        } as HistoryState}
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

function NoTasksGeneratedBadge({ show }: { show: StudioShow }) {
  const { studioId: routeStudioId } = useParams({ strict: false }) as { studioId?: string };
  const actualStudioId = routeStudioId || (show.studio_id as string) || 'fallback';

  return (
    <Link
      to="/studios/$studioId/shows/$showId/tasks"
      params={{ studioId: actualStudioId, showId: show.id }}
      search={{ page: 1, limit: 10 }}
      aria-label="No tasks generated — click to generate tasks"
      title="No tasks have been generated for this show yet. Click to setup and generate tasks."
    >
      <Badge
        variant="outline"
        className="border-slate-300 bg-slate-50 text-slate-600 font-normal shadow-sm hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
      >
        <FileQuestion className="h-3 w-3 mr-1" />
        No Tasks Generated
      </Badge>
    </Link>
  );
}

function NoTaskAssigneeBadge({ show }: { show: StudioShow }) {
  const { studioId: routeStudioId } = useParams({ strict: false }) as { studioId?: string };
  const actualStudioId = routeStudioId || (show.studio_id as string) || 'fallback';

  return (
    <Link
      to="/studios/$studioId/shows/$showId/tasks"
      params={{ studioId: actualStudioId, showId: show.id }}
      search={{ page: 1, limit: 10 }}
      aria-label="No task assignee — click to assign tasks"
      title="Tasks are generated but no assignee is on the hook. Click to assign tasks."
    >
      <Badge
        variant="outline"
        className="border-amber-300 bg-amber-50 text-amber-800 font-normal shadow-sm hover:bg-amber-100"
      >
        <UserMinus className="h-3 w-3 mr-1" />
        No Assignee
      </Badge>
    </Link>
  );
}

function ShowActualsCell({ show }: { show: StudioShow }) {
  const status = getShowActualsStatus(show);

  if (status === 'complete') {
    return (
      <div className="flex flex-col gap-1">
        <Badge variant="outline" className="w-fit border-green-200 bg-green-50 text-green-700 font-normal">
          Complete
        </Badge>
        <span className="text-xs text-muted-foreground">
          {format(new Date(show.actual_start_time!), 'h:mm a')}
          {' - '}
          {format(new Date(show.actual_end_time!), 'h:mm a')}
        </span>
      </div>
    );
  }

  if (status === 'incomplete') {
    return (
      <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 font-normal">
        Incomplete
      </Badge>
    );
  }

  return <Badge variant="secondary" className="font-normal">Missing</Badge>;
}

type StudioShowOperationsColumnActions = {
  onEditActuals: (show: StudioShow) => void;
};

export function getStudioShowOperationsColumns({
  onEditActuals,
}: StudioShowOperationsColumnActions): ColumnDef<StudioShow>[] {
  return [
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
      id: 'actuals_status',
      accessorFn: (row) => getShowActualsStatus(row),
      header: 'Actuals',
      cell: ({ row }) => <ShowActualsCell show={row.original} />,
    },
    {
      id: 'task_status',
      header: 'Task Status',
      cell: ({ row }) => {
        const show = row.original;
        const summary = show.task_summary;

        // Separate status clearly: "No Tasks Generated" vs "No Assignee"
        if (summary.total === 0) {
          return <NoTasksGeneratedBadge show={show} />;
        }

        if (!show.has_proper_task_assignment) {
          return <NoTaskAssigneeBadge show={show} />;
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
    // Hidden filter-support columns so toolbar filters can bind non-visible fields.
    {
      accessorKey: 'client_name',
      header: () => null,
      cell: () => null,
      meta: { className: 'hidden' },
    },
    {
      accessorKey: 'show_type_name',
      header: () => null,
      cell: () => null,
      meta: { className: 'hidden' },
    },
    {
      accessorKey: 'show_standard_name',
      header: () => null,
      cell: () => null,
      meta: { className: 'hidden' },
    },
    {
      accessorKey: 'show_status_name',
      header: () => null,
      cell: () => null,
      meta: { className: 'hidden' },
    },
    {
      accessorKey: 'platform_name',
      header: () => null,
      cell: () => null,
      meta: { className: 'hidden' },
    },
    {
      id: 'has_tasks',
      accessorFn: (row) => String(row.task_summary.total > 0),
      header: () => null,
      cell: () => null,
      meta: { className: 'hidden' },
    },
    {
      id: 'actuals_state',
      accessorFn: (row) => toShowActualsServerFilter(getShowActualsStatus(row)),
      header: () => null,
      cell: () => null,
      meta: { className: 'hidden' },
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <DataTableActions
          row={row.original}
          renderExtraActions={(show) => (
            <DropdownMenuItem onClick={() => onEditActuals(show)}>
              <Clock3 className="mr-2 h-4 w-4" />
              Record actuals
            </DropdownMenuItem>
          )}
        />
      ),
      size: 56,
      enableHiding: false,
    },
  ];
}
