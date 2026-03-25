import { useState } from 'react';
import { toast } from 'sonner';

import type { StudioMemberResponse } from '@eridu/api-types/memberships';
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
import { ROLE_OPTIONS } from '../lib/roles';

type EditMemberDialogProps = {
  studioId: string;
  member: StudioMemberResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function EditMemberForm({
  studioId,
  member,
  onOpenChange,
}: {
  studioId: string;
  member: StudioMemberResponse;
  onOpenChange: (open: boolean) => void;
}) {
  const [role, setRole] = useState(member.role);
  const [baseHourlyRate, setBaseHourlyRate] = useState(
    member.base_hourly_rate !== null && member.base_hourly_rate !== undefined
      ? String(member.base_hourly_rate)
      : '0',
  );
  const updateMutation = useUpdateStudioMember(studioId);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const rate = Number.parseFloat(baseHourlyRate);
    if (Number.isNaN(rate) || rate < 0) {
      toast.error('Hourly rate must be a non-negative number');
      return;
    }
    try {
      await updateMutation.mutateAsync({
        membershipId: member.membership_id,
        payload: { role, base_hourly_rate: rate },
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
        <Select value={role} onValueChange={setRole}>
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
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="edit-rate">Base Hourly Rate ($)</Label>
        <Input
          id="edit-rate"
          type="number"
          min="0"
          step="0.01"
          value={baseHourlyRate}
          onChange={(e) => setBaseHourlyRate(e.target.value)}
          required
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

export function EditMemberDialog({ studioId, member, open, onOpenChange }: EditMemberDialogProps) {
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
            onOpenChange={onOpenChange}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
