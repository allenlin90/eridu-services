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
} from '@eridu/ui';

import { useRemoveStudioMember } from '../api/members';

type RemoveMemberDialogProps = {
  studioId: string;
  member: StudioMemberResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function RemoveMemberDialog({ studioId, member, open, onOpenChange }: RemoveMemberDialogProps) {
  const removeMutation = useRemoveStudioMember(studioId);

  const handleConfirm = async () => {
    if (!member)
      return;

    try {
      await removeMutation.mutateAsync(member.membership_id);
      toast.success(`${member.user_name} has been removed from the studio`);
      onOpenChange(false);
    } catch {
      toast.error('Failed to remove member');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Remove Member</DialogTitle>
          <DialogDescription>
            Are you sure you want to remove
            {' '}
            <span className="font-semibold">{member?.user_name ?? 'this member'}</span>
            {' '}
            from the studio? This action deactivates their access. Historical shift and task records are preserved.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={removeMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => void handleConfirm()}
            disabled={removeMutation.isPending}
          >
            {removeMutation.isPending ? 'Removing...' : 'Remove Member'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
