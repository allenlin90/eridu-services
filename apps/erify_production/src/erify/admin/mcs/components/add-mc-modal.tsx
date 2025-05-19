import Modal from "@/components/modal";
import { AddMcForm } from "@/erify/admin/mcs/components/forms/add-mc-form";
import { Button } from "@eridu/ui/components/button";
import { Plus } from "lucide-react";
import { useCallback, useState } from "react";

export const AddMcModal = () => {
  const [open, setOpen] = useState(false);

  const closeModal = useCallback(() => {
    setOpen(false);
  }, []);

  return (
    <Modal
      open={open}
      onOpenChange={open => setOpen(open)}
      title="Add new MC"
      description="Fill in the details to onboard a MC"
      trigger={(
        <Button
          type="button"
          variant="default"
          className="w-full sm:w-min order-1 sm:order-2"
        >
          <Plus />
          <span>Add MC</span>
        </Button>
      )}
    >
      <AddMcForm cancel={closeModal} />
    </Modal>
  );
};
