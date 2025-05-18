import { useRowActionStore } from "../stores/use-row-action-store";
import { BanUserDialog } from "./dialogs/ban-user-dialog";
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
    </>
  );
};
