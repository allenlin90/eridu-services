import { Link } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';

import type { SchedulePublishImpactRow } from '@eridu/api-types/shows';
import { Badge, Button } from '@eridu/ui';

import * as m from '@/paraglide/messages';

export function createSchedulePublishImpactColumns(
  studioId: string,
  onReview: (row: SchedulePublishImpactRow) => void,
): ColumnDef<SchedulePublishImpactRow>[] {
  return [
    {
      id: 'show',
      header: m.schedule_publish_impacts_column_show(),
      cell: ({ row }) => (
        <div className="space-y-1">
          <Link
            to="/studios/$studioId/shows/$showId"
            params={{ studioId, showId: row.original.show.id }}
            search={{ page: 1, limit: 10 }}
            className="font-medium text-primary hover:underline"
          >
            {row.original.show.name}
          </Link>
          <div className="text-xs text-muted-foreground">
            {row.original.external_id ?? row.original.show.external_id ?? m.schedule_publish_impacts_no_external_id()}
          </div>
        </div>
      ),
    },
    {
      id: 'impact',
      header: m.schedule_publish_impacts_column_impact(),
      cell: ({ row }) => {
        const impact = row.original;
        if (impact.impact_kind === 'stale_conflict') {
          const isResolved = impact.resolution_status !== 'pending';
          return (
            <Badge
              variant={isResolved ? 'secondary' : 'outline'}
              className={isResolved ? undefined : 'border-amber-500 text-amber-700 dark:border-amber-400 dark:text-amber-300'}
            >
              {isResolved
                ? (impact.resolution_status === 'applied'
                    ? m.schedule_publish_impacts_badge_applied()
                    : impact.resolution_status === 'dismissed'
                      ? m.schedule_publish_impacts_badge_dismissed()
                      : m.schedule_publish_impacts_badge_resolved())
                : m.schedule_publish_impacts_badge_needs_review()}
            </Badge>
          );
        }
        if (impact.impact_kind === 'past_show_creator_backfilled') {
          return (
            <Badge
              variant="outline"
              className="border-teal-500 text-teal-700 dark:border-teal-400 dark:text-teal-300"
            >
              Creators backfilled
            </Badge>
          );
        }
        return (
          <Badge variant={impact.impact_kind === 'confirmed_future_pending_resolution' ? 'destructive' : 'secondary'}>
            {impact.impact_kind === 'confirmed_future_pending_resolution'
              ? m.schedule_publish_impacts_badge_pending()
              : m.schedule_publish_impacts_badge_updated()}
          </Badge>
        );
      },
    },
    {
      id: 'start_time',
      header: m.schedule_publish_impacts_column_show_time(),
      cell: ({ row }) => (
        <div className="text-sm">
          {format(new Date(row.original.show.start_time), 'MMM d, yyyy')}
          <div className="text-xs text-muted-foreground">
            {format(new Date(row.original.show.start_time), 'h:mm a')}
            {' - '}
            {format(new Date(row.original.show.end_time), 'h:mm a')}
          </div>
        </div>
      ),
    },
    {
      id: 'status',
      header: m.schedule_publish_impacts_column_status(),
      cell: ({ row }) => (
        row.original.show.status_name
        ?? row.original.show.status_system_key
        ?? m.schedule_publish_impacts_unknown_status()
      ),
    },
    {
      id: 'changed_fields',
      header: m.schedule_publish_impacts_column_changed(),
      cell: ({ row }) => {
        const fields = row.original.changed_fields;
        return fields.length > 0 ? fields.join(', ') : m.schedule_publish_impacts_relation_change();
      },
    },
    {
      id: 'created_at',
      header: m.schedule_publish_impacts_column_recorded(),
      cell: ({ row }) => format(new Date(row.original.created_at), 'MMM d, h:mm a'),
    },
    {
      id: 'review_action',
      header: '',
      cell: ({ row }) => {
        const impact = row.original;
        if (impact.impact_kind !== 'stale_conflict') {
          return null;
        }
        if (impact.resolution_status !== 'pending') {
          return <span className="text-xs text-muted-foreground">{m.schedule_publish_impacts_resolved_label()}</span>;
        }
        return (
          <Button type="button" variant="outline" size="sm" onClick={() => onReview(impact)}>
            {m.schedule_publish_impacts_review_action()}
          </Button>
        );
      },
    },
  ];
}
