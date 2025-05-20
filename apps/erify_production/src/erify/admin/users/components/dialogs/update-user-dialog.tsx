import type { User } from "@/erify/types";

import { UpdateUserForm } from "@/erify/admin/users/components/forms/update-user-form";
import { useRowActionStore } from "@/erify/admin/users/stores/use-row-action-store";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@eridu/ui/components/alert-dialog";

type UpdateUserDialogProps = {
  user: User | null;
} & React.ComponentProps<typeof AlertDialog>;

export const UpdateUserDialog: React.FC<UpdateUserDialogProps> = ({ user, ...props }) => {
  const { closeDialog } = useRowActionStore();

  if (!user)
    return null;

  return (
    <AlertDialog {...props}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Update user</AlertDialogTitle>
          <AlertDialogDescription>
            Update
            {" "}
            {user.name}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <UpdateUserForm user={user} cancel={closeDialog} />
      </AlertDialogContent>
    </AlertDialog>
  );
};
