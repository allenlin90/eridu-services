import { Link } from '@tanstack/react-router';
import { format } from 'date-fns';
import { ArrowLeft, CalendarDays, Edit2, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import type { DateRange } from 'react-day-picker';

import type {
  StudioCreatorCompensationResponse,
  StudioCreatorCompensationShow,
  StudioShowCreatorListItem,
} from '@eridu/api-types/studio-creators';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DatePickerWithRange,
} from '@eridu/ui';

import { PageLayout } from '@/components/layouts/page-layout';
import { ShowCreatorCompensationDialog } from '@/features/studio-show-creators/components/show-creator-compensation-dialog';

export type CreatorCompensationsViewProps = {
  studioId: string;
  dateRange: DateRange;
  data: StudioCreatorCompensationResponse | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  onDateRangeChange: (range: DateRange | undefined) => void;
  onRefresh: () => void;
};

const UNRESOLVED_REASON_LABELS: Record<string, string> = {
  AGREEMENT_SNAPSHOT_MISSING: 'Missing terms',
  COMMISSION_REVENUE_NOT_AVAILABLE: 'Needs revenue',
};

function formatAmount(value: string | null) {
  return value ?? 'Unresolved';
}

function formatUnresolvedReason(value: string | null) {
  if (!value) {
    return null;
  }
  return UNRESOLVED_REASON_LABELS[value] ?? value;
}

function toDialogCreator(show: StudioCreatorCompensationShow): StudioShowCreatorListItem {
  return {
    id: show.show_creator_id,
    creator_id: show.creator_id,
    creator_name: show.creator_name,
    creator_alias_name: show.creator_alias_name,
    note: show.note,
    agreed_rate: show.agreed_rate,
    compensation_type: show.compensation_type,
    commission_rate: show.commission_rate,
    metadata: {},
  };
}

export function CreatorCompensationsView({
  studioId,
  dateRange,
  data,
  isLoading,
  isFetching,
  isError,
  onDateRangeChange,
  onRefresh,
}: CreatorCompensationsViewProps) {
  const [editingShow, setEditingShow] = useState<StudioCreatorCompensationShow | null>(null);
  const shows = data?.shows ?? [];

  const handleEditOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setEditingShow(null);
      onRefresh();
    }
  };

  return (
    <PageLayout
      title="Creator Compensations"
      description={data?.creator_name ?? 'Review per-show compensation by date range.'}
      actions={(
        <Button variant="outline" size="sm" asChild>
          <Link to="/studios/$studioId/creators" params={{ studioId }}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Creators
          </Link>
        </Button>
      )}
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <DatePickerWithRange date={dateRange} setDate={onDateRangeChange} />
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={onRefresh}
            disabled={isFetching}
            aria-label="Refresh creator compensations"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Total</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">
              {data?.total_amount ?? '0.00'}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Unresolved</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">
              {data?.unresolved_count ?? 0}
            </CardContent>
          </Card>
        </div>

        {isLoading && (
          <p className="rounded-md border p-3 text-sm text-muted-foreground">
            Loading compensations...
          </p>
        )}

        {!isLoading && isError && (
          <p className="rounded-md border p-3 text-sm text-destructive">
            Failed to load creator compensations.
          </p>
        )}

        {!isLoading && !isError && shows.length === 0 && (
          <p className="rounded-md border p-3 text-sm text-muted-foreground">
            No show assignments in this range.
          </p>
        )}

        <div className="space-y-2">
          {shows.map((show) => {
            const unresolvedLabel = formatUnresolvedReason(show.unresolved_reason);
            return (
              <div key={show.show_creator_id} className="rounded-md border p-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 space-y-1">
                    <p className="font-medium">{show.show_name}</p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {format(new Date(show.show_start_time), 'PPP p')}
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <Badge variant="outline">{show.compensation_type ?? 'Not set'}</Badge>
                      <span>
                        Rate:
                        {formatAmount(show.agreed_rate)}
                      </span>
                      <span>
                        Commission:
                        {formatAmount(show.commission_rate)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right text-sm">
                      <p className="font-medium">{formatAmount(show.total_amount)}</p>
                      <p className="text-xs text-muted-foreground">
                        Base
                        {' '}
                        {formatAmount(show.base_amount)}
                        {' '}
                        +
                        {' '}
                        Adj
                        {' '}
                        {show.adjustment_total}
                      </p>
                      {unresolvedLabel && (
                        <p className="text-xs text-amber-700">{unresolvedLabel}</p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Edit terms for ${show.show_name}`}
                      onClick={() => setEditingShow(show)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {editingShow && (
        <ShowCreatorCompensationDialog
          open={Boolean(editingShow)}
          onOpenChange={handleEditOpenChange}
          studioId={studioId}
          showId={editingShow.show_id}
          creator={toDialogCreator(editingShow)}
        />
      )}
    </PageLayout>
  );
}
