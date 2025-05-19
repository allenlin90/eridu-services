import { useRowActionStore } from "@/erify/admin/mcs/stores/use-row-action-store";

import { RemoveMcDialog } from "./dialogs/remove-mc-dialog";
import { UpdateMcDialog } from "./dialogs/update-mc-dialog";

export const Dialogs = () => {
  const { mc, action, closeDialog } = useRowActionStore();

  return (
    <>
      <UpdateMcDialog
        open={action === "update_mc"}
        onOpenChange={open => !open && closeDialog()}
        mc={mc}
      />
      <RemoveMcDialog
        open={action === "remove_mc"}
        onOpenChange={open => !open && closeDialog()}
        mc={mc}
      />
    </>
  );
};
