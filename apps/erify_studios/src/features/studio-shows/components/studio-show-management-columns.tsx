import { Link } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import { ArrowUpRight } from 'lucide-react';

import {
  DataTableActions,
  DropdownMenuItem,
} from '@eridu/ui';

import type { StudioShow } from '../api/get-studio-shows';

import {
  DateCell,
  ItemsList,
  ShowStandardBadge,
  ShowStatusBadge,
  ShowTypeBadge,
} from '@/features/admin/components/show-table-cells';

export function getStudioShowManagementColumns(
  studioId: string,
  actions: {
    onEdit: (show: StudioShow) => void;
    onDelete?: (show: StudioShow) => void;
  },
): ColumnDef<StudioShow>[] {
  return [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <div className="flex flex-col gap-1">
          <span className="font-medium">{row.original.name}</span>
          <div className="flex">
            <ShowTypeBadge type={row.original.show_type_name ?? undefined} />
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'show_standard_name',
      header: 'Standard',
      cell: ({ row }) => (
        <ShowStandardBadge standard={row.original.show_standard_name ?? undefined} />
      ),
    },
    {
      id: 'client_name',
      accessorFn: (row) => row.client_name ?? '',
      header: 'Client',
      cell: ({ row }) => (
        <span>{row.original.client_name ?? '—'}</span>
      ),
    },
    {
      accessorKey: 'schedule_name',
      header: 'Schedule / Room',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span>{row.original.schedule_name ?? 'Orphan show'}</span>
          <span className="text-xs text-muted-foreground">{row.original.studio_room_name ?? 'No room'}</span>
        </div>
      ),
    },
    {
      accessorKey: 'show_status_name',
      header: 'Status',
      cell: ({ row }) => (
        <ShowStatusBadge status={row.original.show_status_name ?? 'unknown'} />
      ),
    },
    {
      id: 'creator_name',
      accessorFn: (row) => row.creators.map((creator) => creator.creator_name).join(', '),
      header: 'Creators',
      cell: ({ row }) => (
        <ItemsList
          items={row.original.creators.map((creator) => creator.creator_name)}
          label="Creators"
        />
      ),
      enableSorting: false,
    },
    {
      id: 'tasks',
      header: 'Tasks',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.task_summary.total === 0 ? '—' : `${row.original.task_summary.total} total`}
        </span>
      ),
      enableSorting: false,
    },
    {
      accessorKey: 'start_time',
      header: 'Start Time',
      cell: ({ row }) => <DateCell date={row.original.start_time} />,
    },
    {
      accessorKey: 'end_time',
      header: 'End Time',
      cell: ({ row }) => <DateCell date={row.original.end_time} />,
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <DataTableActions
          row={row.original}
          onEdit={actions.onEdit}
          onDelete={actions.onDelete}
          renderExtraActions={(show) => (
            <DropdownMenuItem asChild>
              <Link
                to="/studios/$studioId/show-operations/$showId/tasks"
                params={{ studioId, showId: show.id }}
              >
                <ArrowUpRight className="mr-2 h-4 w-4" />
                Open Tasks
              </Link>
            </DropdownMenuItem>
          )}
        />
      ),
      size: 56,
      enableHiding: false,
    },
    {
      accessorKey: 'show_type_name',
      header: () => null,
      cell: () => null,
      meta: { className: 'hidden' },
    },
    {
      id: 'platform_name',
      header: () => null,
      cell: () => null,
      meta: { className: 'hidden' },
    },
    {
      id: 'has_schedule',
      header: () => null,
      cell: () => null,
      meta: { className: 'hidden' },
    },
  ];
}
