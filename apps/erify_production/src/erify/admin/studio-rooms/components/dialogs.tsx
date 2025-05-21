import { useRowActionStore } from "@/erify/admin/studio-rooms/stores/use-row-action-store";

import { RemoveStudioRoomDialog } from "./dialogs/remove-studio-room-dialog";
import { UpdateStudioRoomDialog } from "./dialogs/update-studio-room-dialog";

export const Dialogs = () => {
  const { action, studioRoom, closeDialog } = useRowActionStore();

  return (
    <>
      <UpdateStudioRoomDialog
        open={action === "update_studio_room"}
        onOpenChange={open => !open && closeDialog()}
        studioRoom={studioRoom}
      />
      <RemoveStudioRoomDialog
        open={action === "remove_studio_room"}
        onOpenChange={open => !open && closeDialog()}
        studioRoom={studioRoom}
      />
    </>
  );
};
