import { useState } from 'react';
import { toast } from 'sonner';

import type {
  StudioMemberResponse,
  UpdateStudioMemberRequest,
} from '@eridu/api-types/memberships';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@eridu/ui';

import { useUpdateStudioMember } from '../api/members';
import { buildStudioMemberUpdatePayload } from '../lib/build-studio-member-update-payload';
import { ROLE_OPTIONS } from '../lib/roles';

type EditMemberDialogProps = {
  studioId: string;
  member: StudioMemberResponse | null;
  isSelf: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function EditMemberForm({
  studioId,
  member,
  isSelf,
  onOpenChange,
}: {
  studioId: string;
  member: StudioMemberResponse;
  isSelf: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [role, setRole] = useState(member.role);
  const [baseHourlyRate, setBaseHourlyRate] = useState(
    member.base_hourly_rate !== null && member.base_hourly_rate !== undefined
      ? String(member.base_hourly_rate)
      : '',
  );
  const updateMutation = useUpdateStudioMember(studioId);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    let payload: UpdateStudioMemberRequest;
    try {
      payload = buildStudioMemberUpdatePayload(member, role, baseHourlyRate);
    } catch {
      toast.error('Hourly rate must be a non-negative number');
      return;
    }

    try {
      await updateMutation.mutateAsync({
        membershipId: member.membership_id,
        payload,
      });
      toast.success('Member updated');
      onOpenChange(false);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message ?? 'Failed to update member');
    }
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="edit-role">Role</Label>
        <Select value={role} onValueChange={setRole} disabled={isSelf}>
          <SelectTrigger id="edit-role">
            <SelectValue placeholder="Select role" />
          </SelectTrigger>
          <SelectContent>
            {ROLE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isSelf && (
          <p className="text-xs text-muted-foreground">You cannot change your own role.</p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="edit-rate">Base Hourly Rate ($)</Label>
        <Input
          id="edit-rate"
          type="number"
          min="0"
          step="0.01"
          placeholder={member.base_hourly_rate === null ? 'Not set' : undefined}
          value={baseHourlyRate}
          onChange={(e) => setBaseHourlyRate(e.target.value)}
          required={member.base_hourly_rate !== null && member.base_hourly_rate !== undefined}
        />
      </div>
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={updateMutation.isPending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={updateMutation.isPending}>
          {updateMutation.isPending ? 'Saving...' : 'Save'}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function EditMemberDialog({ studioId, member, isSelf, open, onOpenChange }: EditMemberDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Edit Member</DialogTitle>
          <DialogDescription>
            Update role and hourly rate for
            {' '}
            {member?.user_name ?? 'this member'}
            .
          </DialogDescription>
        </DialogHeader>
        {member && (
          <EditMemberForm
            studioId={studioId}
            member={member}
            isSelf={isSelf}
            onOpenChange={onOpenChange}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
