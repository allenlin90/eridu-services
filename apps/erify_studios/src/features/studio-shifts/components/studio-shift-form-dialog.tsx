import { Loader2 } from 'lucide-react';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@eridu/ui';

import type { Membership } from '@/features/memberships/api/get-memberships';
import { ShiftFormFields } from '@/features/studio-shifts/components/shift-form-fields';
import type { ShiftFormState } from '@/features/studio-shifts/types/shift-form.types';

type StudioShiftFormDialogProps = {
  open: boolean;
  title: string;
  description: string;
  idPrefix: string;
  members: Membership[];
  onMemberSearch: (value: string) => void;
  isLoadingMembers: boolean;
  formState: ShiftFormState;
  onFormChange: (next: ShiftFormState) => void;
  includeStatus?: boolean;
  formError: string | null;
  isSubmitting: boolean;
  submitLabel: string;
  onSubmit: () => void;
  onOpenChange: (open: boolean) => void;
  onCancel: () => void;
};

export function StudioShiftFormDialog({
  open,
  title,
  description,
  idPrefix,
  members,
  onMemberSearch,
  isLoadingMembers,
  formState,
  onFormChange,
  includeStatus = false,
  formError,
  isSubmitting,
  submitLabel,
  onSubmit,
  onOpenChange,
  onCancel,
}: StudioShiftFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <ShiftFormFields
            idPrefix={idPrefix}
            members={members}
            onMemberSearch={onMemberSearch}
            isLoadingMembers={isLoadingMembers}
            formState={formState}
            onChange={onFormChange}
            includeStatus={includeStatus}
          />

          {formError && <p className="text-sm font-medium text-destructive">{formError}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
