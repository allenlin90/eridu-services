import { useRowActionStore } from "../stores/use-row-action-store";
import { BanUserDialog } from "./dialogs/ban-user-dialog";
import { ResetPasswordDialog } from "./dialogs/reset-password-dialog";
import { UnbanUserDialog } from "./dialogs/unban-user-dialog";

export const Dialogs: React.FC = () => {
  const { action, user, closeDialog } = useRowActionStore();

  return (
    <>
      <BanUserDialog
        open={action === "ban_user"}
        onOpenChange={open => !open && closeDialog()}
        user={user}
      />
      <UnbanUserDialog
        open={action === "unban_user"}
        onOpenChange={open => !open && closeDialog()}
        user={user}
      />
      <ResetPasswordDialog
        open={action === "reset_user_password"}
        onOpenChange={open => !open && closeDialog()}
        user={user}
      />
    </>
  );
};
