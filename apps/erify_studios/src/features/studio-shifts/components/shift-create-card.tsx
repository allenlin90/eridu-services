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
import { ShiftFormFields } from '@/features/studio-shifts/components/shift-form-fields';
import type { ShiftFormState } from '@/features/studio-shifts/types/shift-form.types';

type ShiftCreateCardProps = {
  members: Membership[];
  formState: ShiftFormState;
  formError: string | null;
  isCreating: boolean;
  isLoadingMembers: boolean;
  onChange: (next: ShiftFormState) => void;
  onCreate: () => void;
};

export function ShiftCreateCard({
  members,
  formState,
  formError,
  isCreating,
  isLoadingMembers,
  onChange,
  onCreate,
}: ShiftCreateCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Shift</CardTitle>
        <CardDescription>
          Create a shift and optionally assign duty manager immediately.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ShiftFormFields
          idPrefix="studio-shift"
          members={members}
          formState={formState}
          onChange={onChange}
        />

        {formError && (
          <p className="text-sm text-destructive">{formError}</p>
        )}

        <Button onClick={onCreate} disabled={isCreating || isLoadingMembers} className="w-full">
          {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Shift
        </Button>
      </CardContent>
    </Card>
  );
}
