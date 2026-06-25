import { Link } from '@tanstack/react-router';
import { Ban, CheckCircle2 } from 'lucide-react';
import { useMemo, useState } from 'react';

import type {
  CancelStudioShowInput,
  GateOutcome,
  StudioShowDetail,
  StudioShowStateGate,
} from '@eridu/api-types/shows';
import {
  AsyncCombobox,
  Badge,
  Button,
  Label,
  ResponsiveDateTimePicker,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@eridu/ui';

import {
  getCancellationActiveTaskCount,
  getCancellationErrorCode,
  useCancelStudioShowWithResolution,
  useResolveStudioShowCancellation,
} from '../api/cancel-studio-show';
import { useStudioShowStateGate } from '../api/get-studio-show-state-gate';

import { ResponsiveDialog } from '@/components/responsive-dialog';
import { useStudioMembers } from '@/features/studio-members/api/members';
import { GateHistory } from '@/features/tasks/components/gate-history';

const REASON_OPTIONS: Array<{ value: CancelStudioShowInput['reason_category']; label: string }> = [
  { value: 'CREATOR_UNAVAILABLE', label: 'Creator unavailable' },
  { value: 'ROOM_UNAVAILABLE', label: 'Room unavailable' },
  { value: 'EQUIPMENT_FAILURE', label: 'Equipment failure' },
  { value: 'UTILITY_OUTAGE', label: 'Utility outage' },
  { value: 'PLATFORM_ISSUE', label: 'Platform issue' },
  { value: 'CLIENT_REQUEST', label: 'Client request' },
  { value: 'OTHER', label: 'Other' },
];

const OUTCOME_LABEL: Record<GateOutcome, string> = {
  CANCELLED: 'Confirm Cancellation',
  COMPLETED: 'Mark Completed',
  RESTORE_PREVIOUS: 'Resume Show',
};

type ShowCancellationResolutionPanelProps = {
  studioId: string;
  show: StudioShowDetail;
  isReadOnly?: boolean;
};

function getStatusKey(show: StudioShowDetail) {
  return show.show_status_system_key ?? show.show_status_name?.toUpperCase() ?? null;
}

function isLiveFromStatus(fromStatus: string) {
  return fromStatus.toUpperCase() === 'LIVE';
}

export function ShowCancellationResolutionPanel({
  studioId,
  show,
  isReadOnly = false,
}: ShowCancellationResolutionPanelProps) {
  const statusKey = getStatusKey(show);
  const isPendingResolution = statusKey === 'CANCELLED_PENDING_RESOLUTION';
  const canCancel = !isReadOnly
    && statusKey !== null
    && !['DRAFT', 'CANCELLED_PENDING_RESOLUTION', 'CANCELLED', 'COMPLETED'].includes(statusKey);

  const { data: stateGate } = useStudioShowStateGate(studioId, show.id, {
    enabled: isPendingResolution && !isReadOnly,
  });

  if (isReadOnly || (!canCancel && !isPendingResolution)) {
    return null;
  }

  return (
    <div className="space-y-3 rounded-md border bg-background p-3 sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold">Cancellation Resolution</h2>
            {isPendingResolution ? <Badge variant="secondary">Pending resolution</Badge> : null}
          </div>
          {stateGate
            ? (
                <div className="space-y-1 text-sm text-muted-foreground">
                  {stateGate.reason_note ? <p>{stateGate.reason_note}</p> : null}
                  <p>
                    Owner:
                    {' '}
                    {stateGate.assignee_name ?? 'Unassigned'}
                  </p>
                </div>
              )
            : (
                <p className="text-sm text-muted-foreground">
                  Move this show into a manager-owned cancellation follow-up workflow.
                </p>
              )}
        </div>

        {isPendingResolution && stateGate
          ? <ResolveCancellationDialog studioId={studioId} show={show} stateGate={stateGate} />
          : <CancelShowDialog studioId={studioId} show={show} />}
      </div>

      {stateGate ? <GateHistory history={stateGate.history} /> : null}
    </div>
  );
}

function CancelShowDialog({ studioId, show }: { studioId: string; show: StudioShowDetail }) {
  const [open, setOpen] = useState(false);
  const [reasonCategory, setReasonCategory] = useState<CancelStudioShowInput['reason_category']>('CREATOR_UNAVAILABLE');
  const [reasonNote, setReasonNote] = useState('');
  const [ownerMembershipId, setOwnerMembershipId] = useState('');
  const [ownerSearch, setOwnerSearch] = useState('');
  const [followUpDueAt, setFollowUpDueAt] = useState('');
  const [followUpNotes, setFollowUpNotes] = useState('');
  const cancelMutation = useCancelStudioShowWithResolution(studioId);

  const { data: membersResponse, isLoading: isLoadingMembers } = useStudioMembers(
    studioId,
    { limit: 50, search: ownerSearch || undefined },
    { enabled: open },
  );

  const memberOptions = useMemo(() => {
    return (membersResponse?.data ?? []).map((member) => ({
      value: member.membership_id,
      label: `${member.user_name} (${member.user_email})`,
    }));
  }, [membersResponse?.data]);

  const reset = () => {
    setReasonCategory('CREATOR_UNAVAILABLE');
    setReasonNote('');
    setOwnerMembershipId('');
    setOwnerSearch('');
    setFollowUpDueAt('');
    setFollowUpNotes('');
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      reset();
    }
    setOpen(nextOpen);
  };

  const canSubmit = reasonNote.trim().length > 0 && ownerMembershipId.length > 0;
  const footer = (
    <>
      <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
      <Button
        type="button"
        disabled={!canSubmit || cancelMutation.isPending}
        onClick={() => {
          cancelMutation.mutate({
            showId: show.id,
            data: {
              reason_category: reasonCategory,
              reason_note: reasonNote.trim(),
              resolution_owner_membership_id: ownerMembershipId,
              follow_up_due_at: followUpDueAt || null,
              follow_up_notes: followUpNotes.trim() || null,
            },
          }, { onSuccess: () => handleOpenChange(false) });
        }}
      >
        {cancelMutation.isPending ? 'Saving...' : 'Move to Pending'}
      </Button>
    </>
  );

  return (
    <>
      <Button type="button" variant="destructive" size="sm" onClick={() => setOpen(true)}>
        <Ban className="h-4 w-4" />
        Cancel for Resolution
      </Button>
      <ResponsiveDialog
        open={open}
        onOpenChange={handleOpenChange}
        title="Cancel for Resolution"
        description="Capture the cancellation reason, owner, and follow-up record."
        contentClassName="sm:max-w-[520px]"
        footer={footer}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Reason Category</Label>
            <Select
              value={reasonCategory}
              onValueChange={(value) => setReasonCategory(value as CancelStudioShowInput['reason_category'])}
            >
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {REASON_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Resolution Owner</Label>
            <AsyncCombobox
              value={ownerMembershipId}
              onChange={setOwnerMembershipId}
              onSearch={setOwnerSearch}
              options={memberOptions}
              isLoading={isLoadingMembers}
              placeholder="Search a studio member..."
            />
          </div>
          <div className="space-y-2">
            <Label>Reason</Label>
            <Textarea
              value={reasonNote}
              onChange={(event) => setReasonNote(event.target.value)}
              rows={3}
              maxLength={1000}
            />
          </div>
          <div className="space-y-2">
            <Label>Follow-up Due</Label>
            <ResponsiveDateTimePicker value={followUpDueAt} onChange={setFollowUpDueAt} className="w-full" />
          </div>
          <div className="space-y-2">
            <Label>Follow-up Notes</Label>
            <Textarea
              value={followUpNotes}
              onChange={(event) => setFollowUpNotes(event.target.value)}
              rows={3}
              maxLength={1000}
            />
          </div>
        </div>
      </ResponsiveDialog>
    </>
  );
}

function ResolveCancellationDialog({
  studioId,
  show,
  stateGate,
}: {
  studioId: string;
  show: StudioShowDetail;
  stateGate: NonNullable<StudioShowStateGate>;
}) {
  const initialOutcome = stateGate.allowed_outcomes[0] ?? 'CANCELLED';
  const [open, setOpen] = useState(false);
  const [outcome, setOutcome] = useState<GateOutcome>(initialOutcome);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [activeTaskBlockerCount, setActiveTaskBlockerCount] = useState<number | null>(null);
  const resolveMutation = useResolveStudioShowCancellation(studioId);
  const isClaimed = stateGate.assignee_id !== null;

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setOutcome(initialOutcome);
      setResolutionNotes('');
      setActiveTaskBlockerCount(null);
    }
    setOpen(nextOpen);
  };

  const isOutcomeDisabled = (candidate: GateOutcome) =>
    candidate === 'CANCELLED' && isLiveFromStatus(stateGate.from_status);

  const footer = (
    <>
      <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
      <Button
        type="button"
        disabled={!isClaimed || resolutionNotes.trim().length === 0 || resolveMutation.isPending}
        onClick={() => {
          setActiveTaskBlockerCount(null);
          resolveMutation.mutate({
            showId: show.id,
            data: { outcome, resolution_notes: resolutionNotes.trim() },
          }, {
            onSuccess: () => handleOpenChange(false),
            onError: (error) => {
              if (getCancellationErrorCode(error) === 'ACTIVE_TASKS_REMAIN') {
                setActiveTaskBlockerCount(getCancellationActiveTaskCount(error));
              }
            },
          });
        }}
      >
        {resolveMutation.isPending ? 'Saving...' : (OUTCOME_LABEL[outcome] ?? 'Resolve')}
      </Button>
    </>
  );

  return (
    <>
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        <CheckCircle2 className="h-4 w-4" />
        Resolve
      </Button>
      <ResponsiveDialog
        open={open}
        onOpenChange={handleOpenChange}
        title="Resolve Cancellation"
        description="Close the pending cancellation gate."
        contentClassName="sm:max-w-[480px]"
        footer={footer}
      >
        <div className="space-y-4">
          {!isClaimed
            ? (
                <p className="rounded-md bg-amber-50 p-2 text-sm text-amber-800">
                  Claim this gate from the task list before resolving it.
                </p>
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
                    before confirming cancellation.
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
          {isLiveFromStatus(stateGate.from_status) && stateGate.allowed_outcomes.includes('CANCELLED')
            ? (
                <p className="rounded-md bg-muted p-2 text-sm text-muted-foreground">
                  This show was live when interrupted. Resume it or mark it completed instead of confirming cancellation.
                </p>
              )
            : null}
          <div className="space-y-2">
            <Label>Outcome</Label>
            <Select value={outcome} onValueChange={(value) => setOutcome(value as GateOutcome)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {stateGate.allowed_outcomes.map((candidate) => (
                  <SelectItem key={candidate} value={candidate} disabled={isOutcomeDisabled(candidate)}>
                    {OUTCOME_LABEL[candidate] ?? candidate}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Resolution Notes</Label>
            <Textarea
              value={resolutionNotes}
              onChange={(event) => setResolutionNotes(event.target.value)}
              rows={4}
              maxLength={1000}
            />
          </div>
        </div>
      </ResponsiveDialog>
    </>
  );
}
