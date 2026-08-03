import { useState } from 'react';

import type { ShowIssueApiResponse, ShowIssueResolutionCode } from '@eridu/api-types/show-issues';
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

import { ResponsiveDialog } from '@/components/responsive-dialog';
import { useResolveShowIssue } from '@/features/studio-shows/api/resolve-show-issue';
import { SHOW_ISSUE_RESOLUTION_CODE_LABELS } from '@/features/studio-shows/lib/show-issue-labels';

type ShowIssueResolveDialogProps = {
  issue: ShowIssueApiResponse | null;
  onOpenChange: (open: boolean) => void;
  studioId: string;
  showId: string;
};

const RESOLUTION_CODE_OPTIONS = Object.entries(SHOW_ISSUE_RESOLUTION_CODE_LABELS)
  .filter(([value]) => value !== 'SOURCE_CORRECTED') // automated-only resolution code
  .map(([value, label]) => [value as ShowIssueResolutionCode, label] as const);

export function ShowIssueResolveDialog(props: ShowIssueResolveDialogProps) {
  const { issue } = props;
  // Keyed remount instead of a reset effect — see show-issue-edit-dialog.tsx.
  return <ShowIssueResolveDialogBody key={issue?.id ?? 'empty'} {...props} />;
}

function ShowIssueResolveDialogBody({ issue, onOpenChange, studioId, showId }: ShowIssueResolveDialogProps) {
  const [resolutionCode, setResolutionCode] = useState<ShowIssueResolutionCode>('FIXED');
  const [resolutionNote, setResolutionNote] = useState('');
  const resolveIssue = useResolveShowIssue(studioId, showId);

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
  };

  const handleSubmit = async () => {
    if (!issue || !resolutionNote.trim()) {
      return;
    }
    await resolveIssue.mutateAsync({
      issueId: issue.id,
      data: {
        version: issue.version,
        resolution_code: resolutionCode,
        resolution_note: resolutionNote.trim(),
      },
    });
    handleOpenChange(false);
  };

  return (
    <ResponsiveDialog
      open={!!issue}
      onOpenChange={handleOpenChange}
      title="Resolve Issue"
      description={issue?.title}
      footer={(
        <>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={resolveIssue.isPending}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={resolveIssue.isPending || !resolutionNote.trim()}
          >
            {resolveIssue.isPending ? 'Resolving...' : 'Resolve'}
          </Button>
        </>
      )}
    >
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="show-issue-resolution-code">Resolution</Label>
          <Select value={resolutionCode} onValueChange={(value) => setResolutionCode(value as ShowIssueResolutionCode)}>
            <SelectTrigger id="show-issue-resolution-code">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RESOLUTION_CODE_OPTIONS.map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="show-issue-resolution-note">Resolution Note</Label>
          <Textarea
            id="show-issue-resolution-note"
            value={resolutionNote}
            onChange={(event) => setResolutionNote(event.target.value)}
            placeholder="Describe how this was resolved"
            rows={3}
          />
        </div>
      </div>
    </ResponsiveDialog>
  );
}
