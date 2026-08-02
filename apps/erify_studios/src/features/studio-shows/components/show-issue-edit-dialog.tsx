import { useState } from 'react';

import type {
  ShowIssueApiResponse,
  ShowIssueCategory,
  ShowIssueSeverity,
  UpdateShowIssueInput,
} from '@eridu/api-types/show-issues';
import {
  Button,
  Checkbox,
  Input,
  Label,
  ResponsiveDateTimePicker,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@eridu/ui';

import { ShowIssueOwnerField } from './show-issue-owner-field';

import { ResponsiveDialog } from '@/components/responsive-dialog';
import { useUpdateShowIssue } from '@/features/studio-shows/api/update-show-issue';
import { SHOW_ISSUE_CATEGORY_LABELS, SHOW_ISSUE_SEVERITY_LABELS } from '@/features/studio-shows/lib/show-issue-labels';

type ShowIssueEditDialogProps = {
  /** Non-null opens the dialog (mirrors `CompensationLineItemUpdateDialog`). */
  issue: ShowIssueApiResponse | null;
  onOpenChange: (open: boolean) => void;
  studioId: string;
  showId: string;
  /**
   * `full`: Admin/Manager — any field. `start-only`: the assigned member on
   * their own OPEN issue — the backend only accepts `{ version, status:
   * 'IN_PROGRESS' }` from them, so the dialog presents nothing else that
   * would only 403. See SHOW_ISSUE_OWNERSHIP_DESIGN.md Authorization.
   */
  mode: 'full' | 'start-only';
};

type FormState = {
  category: ShowIssueCategory;
  severity: ShowIssueSeverity;
  title: string;
  evidence: string;
  ownerId: string;
  dueAt: string;
  markInProgress: boolean;
};

function toFormState(issue: ShowIssueApiResponse): FormState {
  return {
    category: issue.category,
    severity: issue.severity,
    title: issue.title,
    evidence: issue.evidence ?? '',
    ownerId: issue.owner?.uid ?? '',
    dueAt: issue.due_at ?? '',
    markInProgress: false,
  };
}

export function ShowIssueEditDialog(props: ShowIssueEditDialogProps) {
  const { issue } = props;
  // Keyed by issue.id, not a reset effect: remounting on the dialog target
  // change gives fresh local form state without a setState-in-effect
  // cascade (frontend-state-management "keyed state entry").
  return <ShowIssueEditDialogBody key={issue?.id ?? 'empty'} {...props} />;
}

function ShowIssueEditDialogBody({ issue, onOpenChange, studioId, showId, mode }: ShowIssueEditDialogProps) {
  const [form, setForm] = useState<FormState | null>(issue ? toFormState(issue) : null);
  const updateIssue = useUpdateShowIssue(studioId, showId);

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
  };

  const handleSubmit = async () => {
    if (!issue) {
      return;
    }

    if (mode === 'start-only') {
      await updateIssue.mutateAsync({
        issueId: issue.id,
        data: { version: issue.version, status: 'IN_PROGRESS' },
      });
      handleOpenChange(false);
      return;
    }

    if (!form || !form.title.trim()) {
      return;
    }

    const payload: UpdateShowIssueInput = {
      version: issue.version,
      category: form.category,
      severity: form.severity,
      title: form.title.trim(),
      evidence: form.evidence.trim() ? form.evidence.trim() : null,
      owner_id: form.ownerId ? form.ownerId : null,
      due_at: form.dueAt ? form.dueAt : null,
      ...(form.markInProgress && issue.status === 'OPEN' ? { status: 'IN_PROGRESS' as const } : {}),
    };

    await updateIssue.mutateAsync({ issueId: issue.id, data: payload });
    handleOpenChange(false);
  };

  if (mode === 'start-only') {
    return (
      <ResponsiveDialog
        open={!!issue}
        onOpenChange={handleOpenChange}
        title="Start Work"
        description={issue?.title}
        footer={(
          <>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={updateIssue.isPending}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleSubmit()} disabled={updateIssue.isPending}>
              {updateIssue.isPending ? 'Starting...' : 'Start Work'}
            </Button>
          </>
        )}
      >
        <p className="text-sm text-muted-foreground">
          Mark this issue as in progress. Only the fields you can change on your own assigned issue
          are shown — reassignment, severity, and other edits require an Admin or Manager.
        </p>
      </ResponsiveDialog>
    );
  }

  return (
    <ResponsiveDialog
      open={!!issue && !!form}
      onOpenChange={handleOpenChange}
      title="Edit Issue"
      contentClassName="sm:max-w-[560px]"
      footer={(
        <>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={updateIssue.isPending}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={updateIssue.isPending || !form?.title.trim()}
          >
            {updateIssue.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </>
      )}
    >
      {form && issue && (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="show-issue-edit-category">Category</Label>
              <Select
                value={form.category}
                onValueChange={(value) => setForm((prev) => prev && ({ ...prev, category: value as ShowIssueCategory }))}
              >
                <SelectTrigger id="show-issue-edit-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(SHOW_ISSUE_CATEGORY_LABELS) as Array<[ShowIssueCategory, string]>).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="show-issue-edit-severity">Severity</Label>
              <Select
                value={form.severity}
                onValueChange={(value) => setForm((prev) => prev && ({ ...prev, severity: value as ShowIssueSeverity }))}
              >
                <SelectTrigger id="show-issue-edit-severity">
                  <SelectValue placeholder="Select severity" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(SHOW_ISSUE_SEVERITY_LABELS) as Array<[ShowIssueSeverity, string]>).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="show-issue-edit-title">Title</Label>
            <Input
              id="show-issue-edit-title"
              value={form.title}
              onChange={(event) => setForm((prev) => prev && ({ ...prev, title: event.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="show-issue-edit-evidence">Evidence</Label>
            <Textarea
              id="show-issue-edit-evidence"
              value={form.evidence}
              onChange={(event) => setForm((prev) => prev && ({ ...prev, evidence: event.target.value }))}
              rows={3}
            />
          </div>

          <ShowIssueOwnerField
            studioId={studioId}
            value={form.ownerId}
            onChange={(value) => setForm((prev) => prev && ({ ...prev, ownerId: value }))}
            initialOwnerId={issue.owner?.uid}
            initialLabel={issue.owner?.name}
          />

          <div className="space-y-1.5">
            <Label htmlFor="show-issue-edit-due-at">Due Date</Label>
            <ResponsiveDateTimePicker
              value={form.dueAt}
              onChange={(value) => setForm((prev) => prev && ({ ...prev, dueAt: value }))}
              className="w-full"
            />
          </div>

          {issue.status === 'OPEN' && (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.markInProgress}
                onCheckedChange={(checked) => setForm((prev) => prev && ({ ...prev, markInProgress: checked === true }))}
              />
              Mark as In Progress
            </label>
          )}
        </div>
      )}
    </ResponsiveDialog>
  );
}
