import { useState } from 'react';

import type { CreateShowIssueInput, ShowIssueCategory, ShowIssueSeverity } from '@eridu/api-types/show-issues';
import {
  Button,
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
import { useCreateShowIssue } from '@/features/studio-shows/api/create-show-issue';
import { SHOW_ISSUE_CATEGORY_LABELS, SHOW_ISSUE_SEVERITY_LABELS } from '@/features/studio-shows/lib/show-issue-labels';

type ShowIssueCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studioId: string;
  showId: string;
};

const CATEGORY_OPTIONS = Object.entries(SHOW_ISSUE_CATEGORY_LABELS) as Array<[ShowIssueCategory, string]>;
const SEVERITY_OPTIONS = Object.entries(SHOW_ISSUE_SEVERITY_LABELS) as Array<[ShowIssueSeverity, string]>;

type FormState = {
  category: ShowIssueCategory;
  severity: ShowIssueSeverity;
  title: string;
  evidence: string;
  ownerId: string;
  dueAt: string;
};

function createEmptyFormState(): FormState {
  return {
    category: 'OTHER',
    severity: 'MEDIUM',
    title: '',
    evidence: '',
    ownerId: '',
    dueAt: '',
  };
}

export function ShowIssueCreateDialog({ open, onOpenChange, studioId, showId }: ShowIssueCreateDialogProps) {
  const [form, setForm] = useState<FormState>(createEmptyFormState);
  const createIssue = useCreateShowIssue(studioId, showId);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setForm(createEmptyFormState());
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = async () => {
    const title = form.title.trim();
    if (!title) {
      return;
    }

    const payload: CreateShowIssueInput = {
      show_id: showId,
      category: form.category,
      severity: form.severity,
      title,
      evidence: form.evidence.trim() ? form.evidence.trim() : undefined,
      owner_id: form.ownerId ? form.ownerId : undefined,
      due_at: form.dueAt ? form.dueAt : undefined,
    };

    await createIssue.mutateAsync(payload);
    handleOpenChange(false);
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Report Issue"
      description="Create a manual issue for this show."
      contentClassName="sm:max-w-[560px]"
      footer={(
        <>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={createIssue.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={createIssue.isPending || !form.title.trim()}
          >
            {createIssue.isPending ? 'Creating...' : 'Create Issue'}
          </Button>
        </>
      )}
    >
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="show-issue-category">Category</Label>
            <Select
              value={form.category}
              onValueChange={(value) => setForm((prev) => ({ ...prev, category: value as ShowIssueCategory }))}
            >
              <SelectTrigger id="show-issue-category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="show-issue-severity">Severity</Label>
            <Select
              value={form.severity}
              onValueChange={(value) => setForm((prev) => ({ ...prev, severity: value as ShowIssueSeverity }))}
            >
              <SelectTrigger id="show-issue-severity">
                <SelectValue placeholder="Select severity" />
              </SelectTrigger>
              <SelectContent>
                {SEVERITY_OPTIONS.map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="show-issue-title">Title</Label>
          <Input
            id="show-issue-title"
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            placeholder="Brief summary of the issue"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="show-issue-evidence">Evidence</Label>
          <Textarea
            id="show-issue-evidence"
            value={form.evidence}
            onChange={(event) => setForm((prev) => ({ ...prev, evidence: event.target.value }))}
            placeholder="Optional supporting detail"
            rows={3}
          />
        </div>

        <ShowIssueOwnerField
          studioId={studioId}
          value={form.ownerId}
          onChange={(value) => setForm((prev) => ({ ...prev, ownerId: value }))}
        />

        <div className="space-y-1.5">
          <Label htmlFor="show-issue-due-at">Due Date</Label>
          <ResponsiveDateTimePicker
            value={form.dueAt}
            onChange={(value) => setForm((prev) => ({ ...prev, dueAt: value }))}
            className="w-full"
          />
        </div>
      </div>
    </ResponsiveDialog>
  );
}
