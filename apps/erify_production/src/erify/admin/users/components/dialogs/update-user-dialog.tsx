import type { User } from "@/erify/types";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@eridu/ui/components/alert-dialog";
// import { UpdateUserForm } from "@/erify/admin/users/components/forms/update-user"; // Implement this form if needed

type UpdateUserDialogProps = {
  user: User | null;
} & React.ComponentProps<typeof AlertDialog>;

export const UpdateUserDialog: React.FC<UpdateUserDialogProps> = ({ user, ...props }) => {
  // const { closeDialog } = useRowActionStore(); // Use if you want to close dialog from form

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
        {/* <UpdateUserForm user={user} cancel={closeDialog} /> */}
        <div className="p-4 text-muted-foreground">Update form goes here.</div>
      </AlertDialogContent>
    </AlertDialog>
  );
};
