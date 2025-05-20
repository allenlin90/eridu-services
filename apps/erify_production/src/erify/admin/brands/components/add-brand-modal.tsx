import { Modal } from "@/components/modal";
import { AddBrandForm } from "@/erify/admin/brands/components/forms/add-brand-form";
import { Button } from "@eridu/ui/components/button";
import { Plus } from "lucide-react";
import { useCallback, useState } from "react";

export const AddBrandModal = () => {
  const [open, setOpen] = useState(false);

  const closeModal = useCallback(() => {
    setOpen(false);
  }, []);

  return (
    <Modal
      open={open}
      onOpenChange={open => setOpen(open)}
      title="Add new brand"
      description="Fill in the details to create a brand"
      trigger={(
        <Button
          type="button"
          variant="default"
          className="w-full sm:w-min order-1 sm:order-2"
        >
          <Plus />
          <span>Add Brand</span>
        </Button>
      )}
    >
      <AddBrandForm cancel={closeModal} />
    </Modal>
  );
};
