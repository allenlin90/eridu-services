import { Modal } from "@/components/modal";
import { AddMaterialForm } from "@/erify/admin/materials/components/forms/add-material-form";
import { Button } from "@eridu/ui/components/button";
import { Plus } from "lucide-react";
import { useCallback, useState } from "react";

export const AddMaterialModal: React.FC = () => {
  const [open, setOpen] = useState(false);

  const closeModal = useCallback(() => setOpen(false), []);

  return (
    <Modal
      open={open}
      onOpenChange={setOpen}
      title="Add Material"
      description="Fill in the details to create a Material"
      trigger={(
        <Button
          type="button"
          variant="default"
          className="w-full sm:w-min order-1 sm:order-2"
        >
          <Plus />
          <span>Add Material</span>
        </Button>
      )}
    >
      <AddMaterialForm cancel={closeModal} />
    </Modal>
  );
};
