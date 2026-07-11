import { format } from 'date-fns';
import { useState } from 'react';

import type { SchedulePublishImpactRow } from '@eridu/api-types/shows';
import { Button, Label, Textarea } from '@eridu/ui';

import { HeldBackDiff } from './held-back-diff';

import { ResponsiveSheet } from '@/components/responsive-sheet';
import { isConflictAlreadyResolvedError, isShowNoLongerEligibleError, useResolveScheduleConflict } from '@/features/shows/api/resolve-schedule-conflict';
import * as m from '@/paraglide/messages';

type ScheduleConflictReviewPanelProps = {
  studioId: string;
  row: SchedulePublishImpactRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ScheduleConflictReviewPanel({ studioId, row, open, onOpenChange }: ScheduleConflictReviewPanelProps) {
  const [reason, setReason] = useState('');
  const [ineligibleMessage, setIneligibleMessage] = useState<string | null>(null);
  const resolveMutation = useResolveScheduleConflict(studioId);

  if (!row || !row.held_back || !row.conflict_uid) {
    return null;
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setReason('');
      setIneligibleMessage(null);
    }
    onOpenChange(nextOpen);
  };

  const submit = (action: 'apply' | 'dismiss') => {
    setIneligibleMessage(null);
    resolveMutation.mutate(
      { showId: row.show.id, conflictUid: row.conflict_uid!, data: { action, reason: reason.trim() } },
      {
        onSuccess: () => handleOpenChange(false),
        onError: (error) => {
          if (isShowNoLongerEligibleError(error)) {
            setIneligibleMessage(m.schedule_conflict_ineligible_banner());
            return;
          }
          if (isConflictAlreadyResolvedError(error)) {
            setIneligibleMessage(m.schedule_conflict_already_resolved_banner());
          }
        },
      },
    );
  };

  const actionLabel = row.conflict_type === 'removal_held_back' ? m.schedule_conflict_action_apply_cancellation() : m.schedule_conflict_action_apply_edit();

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={handleOpenChange}
      title={row.show.name}
      description={`${row.conflict_type === 'removal_held_back' ? m.schedule_conflict_type_removal_label() : m.schedule_conflict_type_update_label()} · ${m.schedule_conflict_opened_prefix()} ${format(new Date(row.created_at), 'MMM d, h:mm a')}`}
      footer={(
        <div className="w-full space-y-2">
          <Label htmlFor="conflict-reason">{m.schedule_conflict_reason_label()}</Label>
          <Textarea
            id="conflict-reason"
            placeholder={m.schedule_conflict_reason_placeholder()}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">{m.schedule_conflict_reason_hint()}</p>
          {ineligibleMessage
            ? (
                <div className="rounded-md bg-destructive px-3 py-2 text-xs text-destructive-foreground">
                  {ineligibleMessage}
                </div>
              )
            : null}
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={reason.trim().length === 0 || resolveMutation.isPending}
              onClick={() => submit('dismiss')}
            >
              {m.schedule_conflict_action_dismiss()}
            </Button>
            <Button
              type="button"
              disabled={reason.trim().length === 0 || resolveMutation.isPending}
              onClick={() => submit('apply')}
            >
              {resolveMutation.isPending ? m.schedule_conflict_action_saving() : actionLabel}
            </Button>
          </div>
        </div>
      )}
    >
      <HeldBackDiff heldBack={row.held_back} />
    </ResponsiveSheet>
  );
}
