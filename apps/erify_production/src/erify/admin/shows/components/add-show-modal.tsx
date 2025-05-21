import { Modal } from "@/components/modal";
import { AddShowForm } from "@/erify/admin/shows/components/forms/add-show-form";
import { Button } from "@eridu/ui/components/button";
import { cn } from "@eridu/ui/lib/utils";
import { Plus } from "lucide-react";
import { useCallback, useState } from "react";

type AddShowModalProps = {
  buttonProps?: React.ComponentProps<"button">;
};

const defaultButtonProps: React.ComponentProps<"button"> = {};

export const AddShowModal: React.FC<AddShowModalProps> = ({
  buttonProps: { className, ...props } = defaultButtonProps,
}) => {
  const [open, setOpen] = useState(false);

  const closeModal = useCallback(() => {
    setOpen(false);
  }, []);

  return (
    <Modal
      open={open}
      onOpenChange={open => setOpen(open)}
      title="Add new show"
      description="Fill in the details to create a show"
      trigger={(
        <Button
          {...props}
          type="button"
          variant="default"
          className={cn("w-full sm:w-min order-1 sm:order-2", className)}
        >
          <Plus />
          <span>Add Show</span>
        </Button>
      )}
    >
      <AddShowForm cancel={closeModal} />
    </Modal>
  );
};
