import { Modal } from "@/components/modal";
import { AddStudioRoomForm } from "@/erify/admin/studio-rooms/components/forms/add-studio-room-form";
import { Button } from "@eridu/ui/components/button";
import { Plus } from "lucide-react";
import { useCallback, useState } from "react";

export const AddStudioRoomModal = () => {
  const [open, setOpen] = useState(false);

  const closeModal = useCallback(() => {
    setOpen(false);
  }, []);

  return (
    <Modal
      open={open}
      onOpenChange={open => setOpen(open)}
      title="Add new studio room"
      description="Fill in the details to create a studio room"
      trigger={(
        <Button
          type="button"
          variant="default"
          className="w-full sm:w-min order-1 sm:order-2"
        >
          <Plus />
          <span>Add Studio Room</span>
        </Button>
      )}
    >
      <AddStudioRoomForm cancel={closeModal} />
    </Modal>
  );
};
