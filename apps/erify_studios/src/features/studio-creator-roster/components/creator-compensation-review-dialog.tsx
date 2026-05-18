import { format } from 'date-fns';
import { CalendarDays, Edit2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { DateRange } from 'react-day-picker';

import type {
  StudioCreatorCompensationReviewShow,
  StudioCreatorRosterItem,
  StudioShowCreatorListItem,
} from '@eridu/api-types/studio-creators';
import {
  Badge,
  Button,
  DatePickerWithRange,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@eridu/ui';

import { useStudioCreatorCompensationReview } from '../api/studio-creator-roster';

import { addDays } from '@/features/studio-shifts/utils/shift-date.utils';
import { ShowCreatorCompensationDialog } from '@/features/studio-show-creators/components/show-creator-compensation-dialog';

type CreatorCompensationReviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studioId: string;
  creator: StudioCreatorRosterItem;
};

const UNRESOLVED_REASON_LABELS: Record<string, string> = {
  AGREEMENT_SNAPSHOT_MISSING: 'Missing terms',
  COMMISSION_REVENUE_NOT_AVAILABLE: 'Needs revenue',
};

function endOfDay(value: Date) {
  const next = new Date(value);
  next.setHours(23, 59, 59, 999);
  return next;
}

function formatAmount(value: string | null) {
  return value ?? 'Unresolved';
}

function formatUnresolvedReason(value: string | null) {
  if (!value) {
    return null;
  }

  return UNRESOLVED_REASON_LABELS[value] ?? value;
}

function toDialogCreator(show: StudioCreatorCompensationReviewShow): StudioShowCreatorListItem {
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

export function CreatorCompensationReviewDialog({
  open,
  onOpenChange,
  studioId,
  creator,
}: CreatorCompensationReviewDialogProps) {
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const from = new Date();
    return {
      from,
      to: addDays(from, 30),
    };
  });
  const [editingShow, setEditingShow] = useState<StudioCreatorCompensationReviewShow | null>(null);

  const queryParams = useMemo(() => {
    const from = dateRange.from ?? new Date();
    const to = dateRange.to ?? dateRange.from ?? addDays(from, 30);
    return {
      date_from: from.toISOString(),
      date_to: endOfDay(to).toISOString(),
    };
  }, [dateRange.from, dateRange.to]);

  const reviewQuery = useStudioCreatorCompensationReview(
    studioId,
    creator.creator_id,
    queryParams,
    { enabled: open },
  );
  const shows = reviewQuery.data?.shows ?? [];

  const handleEditOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setEditingShow(null);
      void reviewQuery.refetch();
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[920px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Creator Compensation Review</DialogTitle>
            <DialogDescription>{creator.creator_name}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div className="space-y-1.5">
                <p className="text-sm font-medium">Date Range</p>
                <DatePickerWithRange date={dateRange} setDate={setDateRange} />
              </div>
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="font-medium">{reviewQuery.data?.total_amount ?? '0.00'}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Unresolved</p>
                  <p className="font-medium">{reviewQuery.data?.unresolved_count ?? 0}</p>
                </div>
              </div>
            </div>

            {reviewQuery.isLoading && (
              <p className="rounded-md border p-3 text-sm text-muted-foreground">
                Loading compensation review...
              </p>
            )}

            {!reviewQuery.isLoading && shows.length === 0 && (
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
        </DialogContent>
      </Dialog>

      {editingShow && (
        <ShowCreatorCompensationDialog
          open={Boolean(editingShow)}
          onOpenChange={handleEditOpenChange}
          studioId={studioId}
          showId={editingShow.show_id}
          creator={toDialogCreator(editingShow)}
        />
      )}
    </>
  );
}
