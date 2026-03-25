import { useState } from 'react';
import { toast } from 'sonner';

import { STUDIO_ROLE } from '@eridu/api-types/memberships';
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

import { useAddStudioMember } from '../api/members';

type AddMemberDialogProps = {
  studioId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const ROLE_OPTIONS = [
  { value: STUDIO_ROLE.ADMIN, label: 'Admin' },
  { value: STUDIO_ROLE.MANAGER, label: 'Manager' },
  { value: STUDIO_ROLE.TALENT_MANAGER, label: 'Talent Manager' },
  { value: STUDIO_ROLE.DESIGNER, label: 'Designer' },
  { value: STUDIO_ROLE.MODERATION_MANAGER, label: 'Moderation Manager' },
  { value: STUDIO_ROLE.MEMBER, label: 'Member' },
] as const;

export function AddMemberDialog({ studioId, open, onOpenChange }: AddMemberDialogProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<string>(STUDIO_ROLE.MEMBER);
  const [baseHourlyRate, setBaseHourlyRate] = useState<string>('0');

  const addMutation = useAddStudioMember(studioId);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const rate = Number.parseFloat(baseHourlyRate);
    if (Number.isNaN(rate) || rate < 0) {
      toast.error('Hourly rate must be a non-negative number');
      return;
    }

    try {
      await addMutation.mutateAsync({
        email: email.trim(),
        role,
        base_hourly_rate: rate,
      });
      toast.success('Member added successfully');
      setEmail('');
      setRole(STUDIO_ROLE.MEMBER);
      setBaseHourlyRate('0');
      onOpenChange(false);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      const message = err?.response?.data?.message ?? 'Failed to add member';
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Add Studio Member</DialogTitle>
          <DialogDescription>
            Add an existing user to this studio by their email address.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              placeholder="jane@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger id="role">
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
            <Label htmlFor="base_hourly_rate">Base Hourly Rate ($)</Label>
            <Input
              id="base_hourly_rate"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
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
              disabled={addMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={addMutation.isPending}>
              {addMutation.isPending ? 'Adding...' : 'Add Member'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
