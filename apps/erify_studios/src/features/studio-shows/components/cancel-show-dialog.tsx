import { Link } from '@tanstack/react-router';
import { useState } from 'react';

import type { GateOutcome, StudioShowDetail } from '@eridu/api-types/shows';
import { CANCELLATION_GATE_CONFIG } from '@eridu/api-types/shows';
import {
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@eridu/ui';

import { getGateActiveTaskCount, getGateErrorCode, useCancelShowWithResolution } from '../api/cancel-studio-show';
import { useCancellationTier } from '../hooks/use-cancellation-tier';

import { ResponsiveDialog } from '@/components/responsive-dialog';

const REASON_OPTIONS = CANCELLATION_GATE_CONFIG.show_cancellation.reasonOptions;
const OUTCOME_OPTIONS = CANCELLATION_GATE_CONFIG.show_cancellation.allowedOutcomes;

type CancelShowDialogProps = {
  studioId: string;
  show: Pick<StudioShowDetail, 'id'>;
  triggerSize?: 'default' | 'sm';
};

export function CancelShowDialog({ studioId, show, triggerSize = 'default' }: CancelShowDialogProps) {
  const { tier } = useCancellationTier(studioId);
  const [open, setOpen] = useState(false);
  const [reasonCategory, setReasonCategory] = useState('');
  const [reasonNote, setReasonNote] = useState('');
  const [outcome, setOutcome] = useState<GateOutcome | ''>('');
  const [activeTaskBlockerCount, setActiveTaskBlockerCount] = useState<number | null>(null);
  const cancelMutation = useCancelShowWithResolution(studioId);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setReasonCategory('');
      setReasonNote('');
      setOutcome('');
      setActiveTaskBlockerCount(null);
    }
    setOpen(nextOpen);
  };

  const canSubmit = reasonCategory.length > 0
    && reasonNote.trim().length > 0
    && (tier === 'duty_manager' || (tier === 'manager' && outcome !== ''));

  return (
    <>
      <Button type="button" size={triggerSize} disabled={!tier} onClick={() => handleOpenChange(true)}>
        Cancel Show
      </Button>
      <ResponsiveDialog
        open={open}
        onOpenChange={handleOpenChange}
        title="Cancel Show"
        footer={(
          <Button
            type="button"
            disabled={!canSubmit || cancelMutation.isPending}
            onClick={() => {
              setActiveTaskBlockerCount(null);
              cancelMutation.mutate({
                showId: show.id,
                data: {
                  reason_category: reasonCategory,
                  reason_note: reasonNote.trim(),
                  ...(tier === 'manager' && outcome !== '' && { outcome }),
                },
              }, {
                onSuccess: () => handleOpenChange(false),
                onError: (error: unknown) => {
                  if (getGateErrorCode(error) === 'ACTIVE_TASKS_REMAIN') {
                    setActiveTaskBlockerCount(getGateActiveTaskCount(error));
                  }
                },
              });
            }}
          >
            {cancelMutation.isPending ? 'Submitting...' : 'Submit'}
          </Button>
        )}
      >
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="reason-category">Reason category</Label>
            <Select value={reasonCategory} onValueChange={setReasonCategory} aria-label="Reason category">
              <SelectTrigger id="reason-category" aria-label="Reason category">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {REASON_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="reason-note">Reason</Label>
            <Textarea
              id="reason-note"
              aria-label="Reason"
              value={reasonNote}
              onChange={(e) => setReasonNote(e.target.value)}
            />
          </div>
          {tier === 'manager'
            ? (
                <div className="space-y-1">
                  <Label htmlFor="outcome">Outcome</Label>
                  <Select value={outcome} onValueChange={(value) => setOutcome(value as GateOutcome)} aria-label="Outcome">
                    <SelectTrigger id="outcome" aria-label="Outcome">
                      <SelectValue placeholder="Select an outcome" />
                    </SelectTrigger>
                    <SelectContent>
                      {OUTCOME_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )
            : (
                <p className="rounded-md bg-muted p-2 text-sm text-muted-foreground">
                  As Duty Manager, you flag this for a Manager to sign off — you don't choose the final outcome.
                </p>
              )}
          {activeTaskBlockerCount !== null
            ? (
                <div className="space-y-2 rounded-md bg-amber-50 p-2 text-sm text-amber-800">
                  <p>
                    {activeTaskBlockerCount}
                    {' '}
                    active
                    {' '}
                    {activeTaskBlockerCount === 1 ? 'task is' : 'tasks are'}
                    {' '}
                    still attached to this show. Close or reassign
                    {' '}
                    {activeTaskBlockerCount === 1 ? 'it' : 'them'}
                    {' '}
                    before confirming.
                  </p>
                  <Link
                    to="/studios/$studioId/shows/$showId/tasks"
                    params={{ studioId, showId: show.id }}
                    search={{ page: 1, limit: 10 }}
                    className="font-medium underline underline-offset-2"
                  >
                    View show tasks
                  </Link>
                </div>
              )
            : null}
        </div>
      </ResponsiveDialog>
    </>
  );
}
