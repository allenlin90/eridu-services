import { useState } from 'react';
import { toast } from 'sonner';

import type {
  StudioMemberResponse,
  UpdateStudioMemberRequest,
} from '@eridu/api-types/memberships';
import {
  Button,
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

type MemberDefaultsFormProps = {
  studioId: string;
  member: StudioMemberResponse;
  isSelf: boolean;
  canEdit: boolean;
};

export function MemberDefaultsForm({
  studioId,
  member,
  isSelf,
  canEdit,
}: MemberDefaultsFormProps) {
  const [role, setRole] = useState(member.role);
  const [baseHourlyRate, setBaseHourlyRate] = useState(member.base_hourly_rate ?? '');
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
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message ?? 'Failed to update member');
    }
  };

  const fieldsDisabled = !canEdit || updateMutation.isPending;
  const roleDisabled = fieldsDisabled || isSelf;

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="max-w-md space-y-4">
      <p className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
        Roster edits update the default for future shifts only. Existing shift snapshots keep
        their saved hourly rate; edit shift compensation to change a scheduled shift.
      </p>
      <div className="space-y-1.5">
        <Label htmlFor="edit-role">Role</Label>
        <Select value={role} onValueChange={setRole} disabled={roleDisabled}>
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
        {isSelf
          ? (
              <p className="text-xs text-muted-foreground">You cannot change your own role.</p>
            )
          : null}
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
          onChange={(event) => setBaseHourlyRate(event.target.value)}
          required={member.base_hourly_rate !== null && member.base_hourly_rate !== undefined}
          disabled={fieldsDisabled}
        />
      </div>
      {canEdit
        ? (
            <div className="flex justify-end">
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          )
        : (
            <p className="text-sm text-muted-foreground">
              You have read-only access to member defaults.
            </p>
          )}
    </form>
  );
}
