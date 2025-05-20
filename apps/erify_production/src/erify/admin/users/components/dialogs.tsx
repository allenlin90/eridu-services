import { useRowActionStore } from "../stores/use-row-action-store";
import { RemoveUserDialog } from "./dialogs/remove-user-dialog";
import { UpdateUserDialog } from "./dialogs/update-user-dialog";

export const Dialogs: React.FC = () => {
  const { action, user, closeDialog } = useRowActionStore();

  return (
    <>
      <RemoveUserDialog
        open={action === "remove_user"}
        onOpenChange={open => !open && closeDialog()}
        user={user}
      />
      <UpdateUserDialog
        open={action === "update_user"}
        onOpenChange={open => !open && closeDialog()}
        user={user}
      />
    </>
  );
};
