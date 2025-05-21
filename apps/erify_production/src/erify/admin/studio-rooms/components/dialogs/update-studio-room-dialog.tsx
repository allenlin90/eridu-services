import type { StudioRoom } from "@/erify/types";

import { UpdateStudioRoomForm } from "@/erify/admin/studio-rooms/components/forms/update-studio-room-form";
import { useRowActionStore } from "@/erify/admin/studio-rooms/stores/use-row-action-store";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@eridu/ui/components/alert-dialog";

type UpdateStudioRoomDialogProps = {
  studioRoom: StudioRoom | null;
} & React.ComponentProps<typeof AlertDialog>;

export const UpdateStudioRoomDialog: React.FC<UpdateStudioRoomDialogProps> = ({ studioRoom, ...props }) => {
  const { closeDialog } = useRowActionStore();

  if (!studioRoom) {
    return null;
  }

  return (
    <AlertDialog {...props}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Update Studio Room</AlertDialogTitle>
          <AlertDialogDescription>
            Update the details of the studio room:
            {" "}
            {studioRoom.name}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <UpdateStudioRoomForm studioRoom={studioRoom} cancel={closeDialog} />
      </AlertDialogContent>
    </AlertDialog>
  );
};
