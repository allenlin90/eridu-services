import { Modal } from "@/components/modal";
import { AddPlatformForm } from "@/erify/admin/platforms/components/forms/add-platform-form";
import { Button } from "@eridu/ui/components/button";
import { Plus } from "lucide-react";
import { useCallback, useState } from "react";

export const AddPlatformModal = () => {
  const [open, setOpen] = useState(false);

  const closeModal = useCallback(() => {
    setOpen(false);
  }, []);

  return (
    <Modal
      open={open}
      onOpenChange={open => setOpen(open)}
      title="Add new platform"
      description="Fill in the details to create a platform"
      trigger={(
        <Button
          type="button"
          variant="default"
          className="w-full sm:w-min order-1 sm:order-2"
        >
          <Plus />
          <span>Add Platform</span>
        </Button>
      )}
    >
      <AddPlatformForm cancel={closeModal} />
    </Modal>
  );
};
