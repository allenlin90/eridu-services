import { Link } from '@tanstack/react-router';
import { useState } from 'react';

import type { CancellationStatusResponse, StudioShowDetail } from '@eridu/api-types/shows';
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

import {
  getGateActiveTaskCount,
  getGateErrorCode,
  useResolveShowCancellation,
} from '../api/cancel-studio-show';
import { useCancellationTier } from '../hooks/use-cancellation-tier';

import { ResponsiveDialog } from '@/components/responsive-dialog';

const OUTCOME_LABEL: Record<string, string> = {
  CANCELLED: 'Cancelled',
  COMPLETED: 'Completed',
  RESTORE_PREVIOUS: 'Resume Show',
};

type ResolveCancellationDialogProps = {
  studioId: string;
  show: StudioShowDetail;
  status: CancellationStatusResponse;
};

export function ResolveCancellationDialog({ studioId, show, status }: ResolveCancellationDialogProps) {
  const { tier } = useCancellationTier(studioId);
  const [open, setOpen] = useState(false);
  const [outcome, setOutcome] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [activeTaskBlockerCount, setActiveTaskBlockerCount] = useState<number | null>(null);
  const resolveMutation = useResolveShowCancellation(studioId);
  const canResolve = tier === 'manager';

  if (!status.is_pending) {
    return null;
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setOutcome('');
      setResolutionNotes('');
      setActiveTaskBlockerCount(null);
    }
    setOpen(nextOpen);
  };

  return (
    <>
      <Button type="button" onClick={() => handleOpenChange(true)}>{canResolve ? 'Resolve' : 'View'}</Button>
      <ResponsiveDialog
        open={open}
        onOpenChange={handleOpenChange}
        title="Resolve Cancellation"
        footer={canResolve
          ? (
              <Button
                type="button"
                disabled={!outcome || resolutionNotes.trim().length === 0 || resolveMutation.isPending}
                onClick={() => {
                  setActiveTaskBlockerCount(null);
                  resolveMutation.mutate({
                    showId: show.id,
                    data: { outcome: outcome as any, resolution_notes: resolutionNotes.trim() },
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
                {resolveMutation.isPending ? 'Saving...' : 'Confirm'}
              </Button>
            )
          : undefined}
      >
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Flagged by
            {' '}
            {status.opened_by?.name ?? 'System'}
            {' — '}
            {status.reason_category}
            {': '}
            {status.reason_note}
          </p>
          {canResolve
            ? (
                <>
                  <div className="space-y-1">
                    <Label htmlFor="outcome">Outcome</Label>
                    <Select value={outcome} onValueChange={setOutcome} aria-label="Outcome">
                      <SelectTrigger id="outcome" aria-label="Outcome">
                        <SelectValue placeholder="Select an outcome" />
                      </SelectTrigger>
                      <SelectContent>
                        {status.allowed_outcomes.map((value) => (
                          <SelectItem key={value} value={value}>{OUTCOME_LABEL[value] ?? value}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="resolution-notes">Resolution notes</Label>
                    <Textarea
                      id="resolution-notes"
                      aria-label="Resolution notes"
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                    />
                  </div>
                </>
              )
            : null}
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
