import { Modal } from "@/components/modal";
import { AddStudioForm } from "@/erify/admin/studios/components/forms/add-studio-form";
import { Button } from "@eridu/ui/components/button";
import { Plus } from "lucide-react";
import { useCallback, useState } from "react";

export const AddStudioModal = () => {
  const [open, setOpen] = useState(false);

  const closeModal = useCallback(() => {
    setOpen(false);
  }, []);

  return (
    <Modal
      open={open}
      onOpenChange={open => setOpen(open)}
      title="Add new studio"
      description="Fill in the details to create a studio"
      trigger={(
        <Button
          type="button"
          variant="default"
          className="w-full sm:w-min order-1 sm:order-2"
        >
          <Plus />
          <span>Add Studio</span>
        </Button>
      )}
    >
      <AddStudioForm cancel={closeModal} />
    </Modal>
  );
};
