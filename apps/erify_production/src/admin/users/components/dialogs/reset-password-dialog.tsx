import type { UserWithRole } from "@eridu/auth-service/types";

import { ResetUserPasswordForm } from "@/admin/users/components/forms/reset-user-password-form";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@eridu/ui/components/alert-dialog";
import { Button } from "@eridu/ui/components/button";

type ResetPasswordDialogProps = {
  user?: UserWithRole | null;
} & React.ComponentProps<typeof AlertDialog>;

export const ResetPasswordDialog: React.FC<ResetPasswordDialogProps> = ({ user, ...props }) => {
  if (!user)
    return null;

  return (
    <AlertDialog {...props}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reset password</AlertDialogTitle>
          <AlertDialogDescription />
        </AlertDialogHeader>
        <ResetUserPasswordForm id="reset_user_password" user={user} />
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button form="reset_user_password">
            Confirm
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
