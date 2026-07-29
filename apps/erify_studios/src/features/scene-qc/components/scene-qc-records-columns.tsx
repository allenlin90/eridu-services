import type { ColumnDef } from '@tanstack/react-table';

import type { SceneQcRecord } from '@eridu/api-types/scene-qc';
import { Badge } from '@eridu/ui';

import { resolveSceneQcResultChip } from '../lib/scene-qc-result-chip';

const CONFIRMATION_STATUS_CHIP: Record<SceneQcRecord['confirmation_status'], { label: string; className: string }> = {
  UNCONFIRMED: { label: 'Unconfirmed', className: 'bg-muted text-muted-foreground' },
  CONFIRMED: { label: 'Confirmed', className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' },
  SUPERSEDED: { label: 'Superseded', className: 'bg-amber-500/15 text-amber-700 dark:text-amber-300' },
};

/** §7.5 columns: result chip carries a text label plus color (§7.8). */
export const sceneQcRecordsColumns: ColumnDef<SceneQcRecord>[] = [
  {
    accessorKey: 'operational_date',
    header: 'Date',
  },
  {
    accessorKey: 'show_name',
    header: 'Show',
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-medium">{row.original.show_name}</span>
        <span className="text-xs text-muted-foreground">
          {new Date(row.original.scheduled_start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    ),
  },
  {
    id: 'client',
    header: 'Client',
    cell: ({ row }) => row.original.client?.name ?? '—',
  },
  {
    id: 'platforms',
    header: 'Platforms',
    cell: ({ row }) => row.original.platforms.map((platform) => platform.name).join(', ') || '—',
  },
  {
    accessorKey: 'result',
    header: 'Result',
    cell: ({ row }) => {
      const chip = resolveSceneQcResultChip(row.original.result);
      return <Badge variant="outline" className={chip.className}>{chip.label}</Badge>;
    },
  },
  {
    id: 'reviewed_by',
    header: 'Reviewed By',
    cell: ({ row }) => row.original.reviewed_by.name,
  },
  {
    accessorKey: 'confirmation_status',
    header: 'Confirmation',
    cell: ({ row }) => {
      const chip = CONFIRMATION_STATUS_CHIP[row.original.confirmation_status];
      return <Badge variant="outline" className={chip.className}>{chip.label}</Badge>;
    },
  },
];
