import type { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';

import type { ShowIssueApiResponse } from '@eridu/api-types/show-issues';
import type { SearchableColumn } from '@eridu/ui';
import { Badge } from '@eridu/ui';

import { ShowIssueActionsCell } from '../components/show-issue-actions-cell';
import {
  getShowIssueSeverityBadgeClassName,
  getShowIssueStatusBadgeVariant,
  SHOW_ISSUE_CATEGORY_LABELS,
  SHOW_ISSUE_SEVERITY_LABELS,
  SHOW_ISSUE_STATUS_LABELS,
} from '../lib/show-issue-labels';

/**
 * Secondary filters shown in the toolbar's Filters popover. The `owner_id`
 * combobox filter is appended dynamically by `show-issues-table.tsx` only
 * for ADMIN/MANAGER (it queries `/studios/:studioId/members`, which is
 * ADMIN/MANAGER-only) — see that file for the justification.
 */
export const showIssueStaticSearchableColumns: SearchableColumn[] = [
  {
    id: 'status',
    title: 'Status',
    type: 'select',
    options: Object.entries(SHOW_ISSUE_STATUS_LABELS).map(([value, label]) => ({ value, label })),
  },
  {
    id: 'severity',
    title: 'Severity',
    type: 'select',
    options: Object.entries(SHOW_ISSUE_SEVERITY_LABELS).map(([value, label]) => ({ value, label })),
  },
  {
    id: 'category',
    title: 'Category',
    type: 'select',
    options: Object.entries(SHOW_ISSUE_CATEGORY_LABELS).map(([value, label]) => ({ value, label })),
  },
];

type ShowIssueColumnContext = {
  studioId: string;
  showId: string;
  currentUserUid: string | undefined;
  canManageIssues: boolean;
};

export function getShowIssueColumns(ctx: ShowIssueColumnContext): ColumnDef<ShowIssueApiResponse>[] {
  return [
    {
      accessorKey: 'category',
      header: 'Category',
      cell: ({ row }) => SHOW_ISSUE_CATEGORY_LABELS[row.original.category],
    },
    {
      accessorKey: 'severity',
      header: 'Severity',
      cell: ({ row }) => {
        const severity = row.original.severity;
        return (
          <Badge variant="outline" className={getShowIssueSeverityBadgeClassName(severity)}>
            {SHOW_ISSUE_SEVERITY_LABELS[severity]}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={getShowIssueStatusBadgeVariant(row.original.status)}>
          {SHOW_ISSUE_STATUS_LABELS[row.original.status]}
        </Badge>
      ),
    },
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ row }) => (
        <div className="max-w-xs">
          <p className="truncate text-sm font-medium">{row.original.title}</p>
          {row.original.origin === 'FACT_EXTRACTION' && (
            <Badge variant="secondary" className="mt-1 text-[10px]">
              Auto-detected
            </Badge>
          )}
        </div>
      ),
    },
    {
      id: 'owner',
      header: 'Owner',
      cell: ({ row }) =>
        row.original.owner
          ? <span className="text-sm">{row.original.owner.name}</span>
          : <span className="text-sm text-muted-foreground">Unassigned</span>,
    },
    {
      id: 'due_at',
      header: 'Due Date',
      cell: ({ row }) => (row.original.due_at ? format(new Date(row.original.due_at), 'MMM d, yyyy') : '—'),
    },
    {
      id: 'created_at',
      header: 'Created',
      cell: ({ row }) => format(new Date(row.original.created_at), 'MMM d, yyyy'),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <ShowIssueActionsCell
          studioId={ctx.studioId}
          showId={ctx.showId}
          issue={row.original}
          currentUserUid={ctx.currentUserUid}
          canManageIssues={ctx.canManageIssues}
        />
      ),
    },
    // Hidden filter-only columns: give `table.getColumn(id)` a target for
    // manual/server-side filtering without rendering a visible column.
    {
      id: 'search',
      header: () => null,
      cell: () => null,
      meta: { className: 'hidden' },
    },
    {
      id: 'owner_id',
      header: () => null,
      cell: () => null,
      meta: { className: 'hidden' },
    },
  ];
}
