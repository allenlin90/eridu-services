import { useState } from 'react';

import type { ShowIssueApiResponse } from '@eridu/api-types/show-issues';
import { Button, Label, Textarea } from '@eridu/ui';

import { ResponsiveDialog } from '@/components/responsive-dialog';
import { useReopenShowIssue } from '@/features/studio-shows/api/reopen-show-issue';

type ShowIssueReopenDialogProps = {
  issue: ShowIssueApiResponse | null;
  onOpenChange: (open: boolean) => void;
  studioId: string;
  showId: string;
};

export function ShowIssueReopenDialog(props: ShowIssueReopenDialogProps) {
  const { issue } = props;
  // Keyed remount instead of a reset effect — see show-issue-edit-dialog.tsx.
  return <ShowIssueReopenDialogBody key={issue?.id ?? 'empty'} {...props} />;
}

function ShowIssueReopenDialogBody({ issue, onOpenChange, studioId, showId }: ShowIssueReopenDialogProps) {
  const [reason, setReason] = useState('');
  const reopenIssue = useReopenShowIssue(studioId, showId);
  const trimmedReason = reason.trim();

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
  };

  const handleSubmit = async () => {
    if (!issue || !trimmedReason) {
      return;
    }
    await reopenIssue.mutateAsync({
      issueId: issue.id,
      data: { version: issue.version, reason: trimmedReason },
    });
    handleOpenChange(false);
  };

  return (
    <ResponsiveDialog
      open={!!issue}
      onOpenChange={handleOpenChange}
      title="Reopen Issue"
      description={issue?.title}
      footer={(
        <>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={reopenIssue.isPending}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleSubmit()} disabled={reopenIssue.isPending || !trimmedReason}>
            {reopenIssue.isPending ? 'Reopening...' : 'Reopen'}
          </Button>
        </>
      )}
    >
      <div className="space-y-1.5">
        <Label htmlFor="show-issue-reopen-reason">Reason</Label>
        <Textarea
          id="show-issue-reopen-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Why is this issue being reopened?"
          rows={3}
        />
      </div>
    </ResponsiveDialog>
  );
}
