import { Ban, CheckCircle2 } from 'lucide-react';
import { useMemo, useState } from 'react';

import type {
  CancelStudioShowInput,
  ResolveStudioShowCancellationInput,
  StudioShowDetail,
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
  useCancelStudioShowWithResolution,
  useResolveStudioShowCancellation,
} from '../api/cancel-studio-show';

import { ResponsiveDialog } from '@/components/responsive-dialog';
import { useStudioMembers } from '@/features/studio-members/api/members';

const REASON_OPTIONS: Array<{ value: CancelStudioShowInput['reason_category']; label: string }> = [
  { value: 'CREATOR_UNAVAILABLE', label: 'Creator unavailable' },
  { value: 'ROOM_UNAVAILABLE', label: 'Room unavailable' },
  { value: 'EQUIPMENT_FAILURE', label: 'Equipment failure' },
  { value: 'UTILITY_OUTAGE', label: 'Utility outage' },
  { value: 'PLATFORM_ISSUE', label: 'Platform issue' },
  { value: 'CLIENT_REQUEST', label: 'Client request' },
  { value: 'OTHER', label: 'Other' },
];

type ShowCancellationResolutionPanelProps = {
  studioId: string;
  show: StudioShowDetail;
  isReadOnly?: boolean;
};

function getStatusKey(show: StudioShowDetail) {
  return show.show_status_system_key ?? show.show_status_name?.toUpperCase() ?? null;
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
    && statusKey !== 'DRAFT'
    && statusKey !== 'CANCELLED_PENDING_RESOLUTION'
    && statusKey !== 'CANCELLED';

  if (isReadOnly || (!canCancel && !isPendingResolution)) {
    return null;
  }

  return (
    <div className="rounded-md border bg-background p-3 sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold">Cancellation Resolution</h2>
            {isPendingResolution ? <Badge variant="secondary">Pending resolution</Badge> : null}
          </div>
          {show.cancellation_resolution
            ? (
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>{show.cancellation_resolution.reason_note}</p>
                  <p>
                    Owner:
                    {' '}
                    {show.cancellation_resolution.resolution_owner_name ?? 'Unassigned'}
                    {show.cancellation_resolution.follow_up_due_at
                      ? ` · Due ${new Date(show.cancellation_resolution.follow_up_due_at).toLocaleString()}`
                      : ''}
                  </p>
                </div>
              )
            : (
                <p className="text-sm text-muted-foreground">
                  Move this show into a manager-owned cancellation follow-up workflow.
                </p>
              )}
        </div>

        {isPendingResolution
          ? <ResolveCancellationDialog studioId={studioId} show={show} />
          : <CancelShowDialog studioId={studioId} show={show} />}
      </div>
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
      <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
        Cancel
      </Button>
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
          }, {
            onSuccess: () => handleOpenChange(false),
          });
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
            <Select value={reasonCategory} onValueChange={(value) => setReasonCategory(value as CancelStudioShowInput['reason_category'])}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REASON_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
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

function ResolveCancellationDialog({ studioId, show }: { studioId: string; show: StudioShowDetail }) {
  const [open, setOpen] = useState(false);
  const [finalDisposition, setFinalDisposition] = useState<ResolveStudioShowCancellationInput['final_disposition']>('CANCELLED');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const resolveMutation = useResolveStudioShowCancellation(studioId);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setFinalDisposition('CANCELLED');
      setResolutionNotes('');
    }
    setOpen(nextOpen);
  };

  const footer = (
    <>
      <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
        Cancel
      </Button>
      <Button
        type="button"
        disabled={resolutionNotes.trim().length === 0 || resolveMutation.isPending}
        onClick={() => {
          resolveMutation.mutate({
            showId: show.id,
            data: {
              final_disposition: finalDisposition,
              resolution_notes: resolutionNotes.trim(),
            },
          }, {
            onSuccess: () => handleOpenChange(false),
          });
        }}
      >
        {resolveMutation.isPending ? 'Saving...' : 'Resolve'}
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
        description="Close the pending cancellation as cancelled or completed."
        contentClassName="sm:max-w-[480px]"
        footer={footer}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Final Disposition</Label>
            <Select
              value={finalDisposition}
              onValueChange={(value) =>
                setFinalDisposition(value as ResolveStudioShowCancellationInput['final_disposition'])}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
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
