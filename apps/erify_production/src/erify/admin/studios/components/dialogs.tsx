import { useRowActionStore } from "../stores/use-row-action-store";
import { RemoveStudioDialog } from "./dialogs/remove-studio-dialog";
import { UpdateStudioDialog } from "./dialogs/update-studio-dialog";

export const Dialogs: React.FC = () => {
  const { action, studio, closeDialog } = useRowActionStore();

  return (
    <>
      <RemoveStudioDialog
        open={action === "remove_studio"}
        onOpenChange={open => !open && closeDialog()}
        studio={studio}
      />
      <UpdateStudioDialog
        open={action === "update_studio"}
        onOpenChange={open => !open && closeDialog()}
        studio={studio}
      />
    </>
  );
};
