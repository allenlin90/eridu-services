import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@eridu/ui';

import { UserUpdateForm } from './user-update-form';

import type { ExtendedUser } from '@/lib/types';

type UserUpdateDialogProps = {
  user: ExtendedUser | null;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

export function UserUpdateDialog({
  user,
  onOpenChange,
  onSuccess,
}: UserUpdateDialogProps) {
  return (
    <Dialog open={!!user} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update user details and permissions.
          </DialogDescription>
        </DialogHeader>
        {user && (
          <UserUpdateForm
            user={user}
            onCancel={() => onOpenChange(false)}
            onSuccess={onSuccess}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
