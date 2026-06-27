import { Ban, History } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';

import type { CancellationStatusResponse } from '@eridu/api-types/shows';
import { CANCELLATION_GATE_CONFIG } from '@eridu/api-types/shows';
import {
  Button,
  DropdownMenuItem,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@eridu/ui';

import {
  useCancellationStatus,
  useRequestCancellationResolution,
} from '../api/cancel-studio-show';
import { useActiveDutyManagerEligibility } from '../hooks/use-cancellation-tier';

import { GateHistory } from './gate-history';

import { ResponsiveDialog } from '@/components/responsive-dialog';

const REASON_OPTIONS = CANCELLATION_GATE_CONFIG.show_cancellation.reasonOptions;

type DashboardCancellationActionsProps = {
  studioId: string;
  showId: string;
  canRequestCancellation: boolean;
  renderTrigger: (props: {
    requestItem: ReactNode | null;
    historyItem: ReactNode | null;
  }) => ReactNode;
};

function CancellationHistoryDialog({
  status,
  open,
  onOpenChange,
}: {
  status: CancellationStatusResponse | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Cancellation History"
      footer={(
        <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
          Close
        </Button>
      )}
    >
      <GateHistory history={status?.history ?? []} />
    </ResponsiveDialog>
  );
}

export function DashboardCancellationActions({
  studioId,
  showId,
  canRequestCancellation,
  renderTrigger,
}: DashboardCancellationActionsProps) {
  const { isActiveDutyManager } = useActiveDutyManagerEligibility(studioId);
  const { data: status } = useCancellationStatus(studioId, showId);
  const requestMutation = useRequestCancellationResolution(studioId);
  const [requestOpen, setRequestOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [reasonCategory, setReasonCategory] = useState('');
  const [reasonNote, setReasonNote] = useState('');

  const resetRequestState = () => {
    setReasonCategory('');
    setReasonNote('');
  };
  const handleRequestOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetRequestState();
    }
    setRequestOpen(nextOpen);
  };
  const canSubmitRequest = reasonCategory.length > 0 && reasonNote.trim().length > 0;
  const hasHistory = Boolean(status?.history.length);
  const requestItem = canRequestCancellation
    ? (
        <DropdownMenuItem
          disabled={!isActiveDutyManager}
          onSelect={(event) => {
            event.preventDefault();
            setRequestOpen(true);
          }}
        >
          <Ban className="mr-2 h-4 w-4" />
          Request Cancellation
        </DropdownMenuItem>
      )
    : null;
  const historyItem = hasHistory
    ? (
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            setHistoryOpen(true);
          }}
        >
          <History className="mr-2 h-4 w-4" />
          View Cancellation History
        </DropdownMenuItem>
      )
    : null;

  if (!requestItem && !historyItem) {
    return <span>-</span>;
  }

  return (
    <>
      {renderTrigger({ requestItem, historyItem })}
      <ResponsiveDialog
        open={requestOpen}
        onOpenChange={handleRequestOpenChange}
        title="Request Cancellation"
        footer={(
          <Button
            type="button"
            disabled={!canSubmitRequest || requestMutation.isPending}
            onClick={() => {
              requestMutation.mutate({
                showId,
                data: {
                  reason_category: reasonCategory,
                  reason_note: reasonNote.trim(),
                },
              }, {
                onSuccess: () => handleRequestOpenChange(false),
              });
            }}
          >
            {requestMutation.isPending ? 'Submitting...' : 'Submit'}
          </Button>
        )}
      >
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor={`dashboard-reason-category-${showId}`}>Reason category</Label>
            <Select value={reasonCategory} onValueChange={setReasonCategory} aria-label="Reason category">
              <SelectTrigger id={`dashboard-reason-category-${showId}`} aria-label="Reason category">
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
            <Label htmlFor={`dashboard-reason-note-${showId}`}>Reason</Label>
            <Textarea
              id={`dashboard-reason-note-${showId}`}
              aria-label="Reason"
              value={reasonNote}
              onChange={(event) => setReasonNote(event.target.value)}
            />
          </div>
        </div>
      </ResponsiveDialog>
      <CancellationHistoryDialog status={status} open={historyOpen} onOpenChange={setHistoryOpen} />
    </>
  );
}
