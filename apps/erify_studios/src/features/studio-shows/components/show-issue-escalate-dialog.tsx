import { useState } from 'react';

import type { ShowIssueApiResponse } from '@eridu/api-types/show-issues';
import { Button, Label, Textarea } from '@eridu/ui';

import { ResponsiveDialog } from '@/components/responsive-dialog';
import { useEscalateShowIssue } from '@/features/studio-shows/api/escalate-show-issue';

type ShowIssueEscalateDialogProps = {
  issue: ShowIssueApiResponse | null;
  onOpenChange: (open: boolean) => void;
  studioId: string;
  showId: string;
};

export function ShowIssueEscalateDialog(props: ShowIssueEscalateDialogProps) {
  const { issue } = props;
  // Keyed remount instead of a reset effect — see show-issue-edit-dialog.tsx.
  return <ShowIssueEscalateDialogBody key={issue?.id ?? 'empty'} {...props} />;
}

function ShowIssueEscalateDialogBody({ issue, onOpenChange, studioId, showId }: ShowIssueEscalateDialogProps) {
  const [escalationNote, setEscalationNote] = useState('');
  const escalateIssue = useEscalateShowIssue(studioId, showId);

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
  };

  const handleSubmit = async () => {
    if (!issue) {
      return;
    }
    await escalateIssue.mutateAsync({
      issueId: issue.id,
      data: { version: issue.version, escalation_note: escalationNote.trim() ? escalationNote.trim() : undefined },
    });
    handleOpenChange(false);
  };

  return (
    <ResponsiveDialog
      open={!!issue}
      onOpenChange={handleOpenChange}
      title="Escalate Issue"
      description={issue?.title}
      footer={(
        <>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={escalateIssue.isPending}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleSubmit()} disabled={escalateIssue.isPending}>
            {escalateIssue.isPending ? 'Escalating...' : 'Escalate'}
          </Button>
        </>
      )}
    >
      <div className="space-y-1.5">
        <Label htmlFor="show-issue-escalation-note">Escalation Note (optional)</Label>
        <Textarea
          id="show-issue-escalation-note"
          value={escalationNote}
          onChange={(event) => setEscalationNote(event.target.value)}
          placeholder="Why is this issue being escalated?"
          rows={3}
        />
      </div>
    </ResponsiveDialog>
  );
}
