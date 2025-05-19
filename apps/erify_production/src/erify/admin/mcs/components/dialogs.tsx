import { useRowActionStore } from "@/erify/admin/mcs/stores/use-row-action-store";

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
    </>
  );
};
