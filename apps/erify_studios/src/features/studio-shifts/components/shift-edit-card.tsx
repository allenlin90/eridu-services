import { Loader2 } from 'lucide-react';

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@eridu/ui';

import type { Membership } from '@/features/memberships/api/get-memberships';
import type { StudioShift } from '@/features/studio-shifts/api/studio-shifts.types';
import { ShiftFormFields } from '@/features/studio-shifts/components/shift-form-fields';
import type { ShiftFormState } from '@/features/studio-shifts/types/shift-form.types';

type ShiftEditCardProps = {
  shift: StudioShift;
  memberName?: string;
  dateLabel: string;
  members: Membership[];
  onMemberSearch: (value: string) => void;
  isLoadingMembers?: boolean;
  formState: ShiftFormState;
  formError: string | null;
  isSaving: boolean;
  onChange: (next: ShiftFormState) => void;
  onSave: () => void;
  onCancel: () => void;
};

export function ShiftEditCard({
  shift,
  memberName,
  dateLabel,
  members,
  onMemberSearch,
  isLoadingMembers = false,
  formState,
  formError,
  isSaving,
  onChange,
  onSave,
  onCancel,
}: ShiftEditCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Shift</CardTitle>
        <CardDescription>
          Updating
          {' '}
          {memberName ?? shift.user_id}
          {' '}
          on
          {' '}
          {dateLabel}
          .
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ShiftFormFields
          idPrefix="shift-edit"
          members={members}
          onMemberSearch={onMemberSearch}
          isLoadingMembers={isLoadingMembers}
          formState={formState}
          onChange={onChange}
          includeStatus
        />

        {formError && (
          <p className="text-sm text-destructive">{formError}</p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={onSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
          <Button size="sm" variant="outline" onClick={onCancel} disabled={isSaving}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
