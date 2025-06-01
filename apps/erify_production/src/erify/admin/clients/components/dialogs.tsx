import { useRowActionStore } from "../stores/use-row-action-store";
import { RemoveClientDialog } from "./dialogs/remove-client-dialog";
import { UpdateClientDialog } from "./dialogs/update-client-dialog";

export const Dialogs: React.FC = () => {
  const { action, client, closeDialog } = useRowActionStore();

  return (
    <>
      <RemoveClientDialog
        open={action === "remove_client"}
        onOpenChange={open => !open && closeDialog()}
        client={client}
      />
      <UpdateClientDialog
        open={action === "update_client"}
        onOpenChange={open => !open && closeDialog()}
        client={client}
      />
    </>
  );
};
