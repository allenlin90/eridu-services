import { Modal } from "@/components/modal";
import { AddUserForm } from "@/erify/admin/users/components/forms/add-user-form";
import { Button } from "@eridu/ui/components/button";
import { Plus } from "lucide-react";
import { useCallback, useState } from "react";

export const AddUserModal = () => {
  const [open, setOpen] = useState(false);

  const closeModal = useCallback(() => {
    setOpen(false);
  }, []);

  return (
    <Modal
      open={open}
      onOpenChange={open => setOpen(open)}
      title="Add new user"
      description="Fill in the details to create a user"
      trigger={(
        <Button
          type="button"
          variant="default"
          className="w-full sm:w-min order-1 sm:order-2"
        >
          <Plus />
          <span>Add User</span>
        </Button>
      )}
    >
      <AddUserForm cancel={closeModal} />
    </Modal>
  );
};
