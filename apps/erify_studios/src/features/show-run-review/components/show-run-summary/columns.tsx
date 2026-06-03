import type { ColumnDef } from '@tanstack/react-table';
import { Clock, XCircle } from 'lucide-react';

import type { ShowRunReviewSummary } from '@eridu/api-types/shows';
import { Badge } from '@eridu/ui';

export type CreatorException = ShowRunReviewSummary['creators']['exceptions'][number];
export type PlatformViolation = ShowRunReviewSummary['platforms']['violations'][number];
export type IncompleteTask = ShowRunReviewSummary['tasks']['incomplete_tasks'][number];

export type ShowsSummaryRow = {
  id: string;
  shows_range: string;
  actuals_completeness: string;
  status: string;
};

// Creator exception logs columns definition
export const creatorColumns: ColumnDef<CreatorException>[] = [
  {
    accessorKey: 'creator_name',
    header: 'Creator Name',
    cell: ({ row }) => <span className="font-semibold text-sm">{row.original.creator_name}</span>,
  },
  {
    accessorKey: 'show_name',
    header: 'Show Name',
    meta: { className: 'whitespace-normal break-words min-w-[150px]' },
    cell: ({ row }) => (
      <div className="space-y-0.5 whitespace-normal break-words">
        <div className="font-medium text-xs">{row.original.show_name}</div>
        <div className="text-[10px] text-muted-foreground">
          Start:
          {' '}
          {new Date(row.original.show_start_time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.original.status;
      return status === 'MISSING'
        ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700 border border-rose-200">
              <XCircle className="h-3 w-3" />
              {' '}
              Missing
            </span>
          )
        : (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 border border-amber-200">
              <Clock className="h-3 w-3" />
              {' '}
              Late Arrival
            </span>
          );
    },
  },
  {
    accessorKey: 'late_minutes',
    header: 'Exception Details',
    cell: ({ row }) => {
      const status = row.original.status;
      const lateMinutes = row.original.late_minutes;
      return status === 'LATE'
        ? (
            <span className="text-xs font-semibold text-amber-800">
              {lateMinutes}
              {' '}
              minutes late
            </span>
          )
        : (
            <span className="text-xs text-muted-foreground">—</span>
          );
    },
  },
  {
    accessorKey: 'reason',
    header: 'Operator\'s Note / Reason',
    meta: { className: 'whitespace-normal break-words min-w-[180px] max-w-[280px]' },
    cell: ({ row }) => {
      const reason = row.original.reason;
      return reason
        ? (
            <span className="not-italic text-xs text-foreground bg-muted/40 rounded px-2 py-1 border block whitespace-normal break-words">
              {reason}
            </span>
          )
        : (
            <span className="text-xs italic text-muted-foreground">No reason specified</span>
          );
    },
  },
];

// Platform violation columns definition
export const violationColumns: ColumnDef<PlatformViolation>[] = [
  {
    accessorKey: 'platform_name',
    header: 'Platform',
    cell: ({ row }) => <span className="font-semibold text-sm">{row.original.platform_name}</span>,
  },
  {
    accessorKey: 'show_name',
    header: 'Show Name',
    meta: { className: 'whitespace-normal break-words min-w-[150px]' },
    cell: ({ row }) => (
      <div className="space-y-0.5 whitespace-normal break-words">
        <div className="font-medium text-xs">{row.original.show_name}</div>
        <div className="text-[10px] text-muted-foreground">
          Start:
          {' '}
          {new Date(row.original.show_start_time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    ),
  },
  {
    accessorKey: 'violation_type',
    header: 'Violation Type',
    cell: ({ row }) => <span className="font-medium text-xs text-rose-700">{row.original.violation_type}</span>,
  },
  {
    accessorKey: 'severity',
    header: 'Severity',
    cell: ({ row }) => {
      const severity = row.original.severity;
      if (severity === 'CRITICAL') {
        return (
          <span className="rounded bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-800 border border-rose-200">
            CRITICAL
          </span>
        );
      }
      if (severity === 'HIGH') {
        return (
          <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-bold text-red-800">
            HIGH
          </span>
        );
      }
      if (severity === 'MEDIUM') {
        return (
          <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
            MEDIUM
          </span>
        );
      }
      if (severity === 'LOW') {
        return (
          <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-800">
            LOW
          </span>
        );
      }
      if (severity === 'WARNING') {
        return (
          <span className="rounded bg-yellow-100 px-2 py-0.5 text-xs font-bold text-yellow-800 border border-yellow-200">
            WARNING
          </span>
        );
      }
      return (
        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-800 border border-slate-200">
          {severity}
        </span>
      );
    },
  },
  {
    accessorKey: 'reason',
    header: 'Reason / Details',
    meta: { className: 'whitespace-normal break-words min-w-[180px] max-w-[280px]' },
    cell: ({ row }) => <span className="text-xs block whitespace-normal break-words">{row.original.reason}</span>,
  },
  {
    accessorKey: 'observed_at',
    header: 'Observed At',
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">
        {new Date(row.original.observed_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </span>
    ),
  },
];

// Incomplete tasks columns definition
export const taskColumns: ColumnDef<IncompleteTask>[] = [
  {
    accessorKey: 'description',
    header: 'Task Description',
    meta: { className: 'whitespace-normal break-words min-w-[200px]' },
    cell: ({ row }) => <span className="font-medium text-sm whitespace-normal break-words">{row.original.description}</span>,
  },
  {
    accessorKey: 'type',
    header: 'Phase / Type',
    cell: ({ row }) => (
      <Badge variant="outline" className="text-[10px] font-medium border-purple-200 bg-purple-50 text-purple-700 uppercase">
        {row.original.type.replace('_', ' ')}
      </Badge>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 border">
        {row.original.status}
      </span>
    ),
  },
  {
    accessorKey: 'show_name',
    header: 'Associated Show',
    meta: { className: 'whitespace-normal break-words min-w-[150px]' },
    cell: ({ row }) => <span className="text-xs font-semibold text-indigo-700 whitespace-normal break-words">{row.original.show_name}</span>,
  },
];

// Shows range summary columns definition
export const showColumns: ColumnDef<ShowsSummaryRow>[] = [
  {
    accessorKey: 'shows_range',
    header: 'Shows Range Summary',
    meta: { className: 'whitespace-normal break-words min-w-[150px]' },
    cell: ({ row }) => <span className="font-semibold text-sm whitespace-normal break-words">{row.original.shows_range}</span>,
  },
  {
    accessorKey: 'actuals_completeness',
    header: 'Actuals Completeness',
    meta: { className: 'whitespace-normal break-words min-w-[150px]' },
    cell: ({ row }) => <span className="text-xs whitespace-normal break-words">{row.original.actuals_completeness}</span>,
  },
  {
    accessorKey: 'status',
    header: 'Status Check',
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <Badge
          variant={status === 'ALL STARTED' ? 'outline' : 'destructive'}
          className={status === 'ALL STARTED' ? 'border-green-200 bg-green-50 text-green-700 font-normal' : ''}
        >
          {status}
        </Badge>
      );
    },
  },
];
