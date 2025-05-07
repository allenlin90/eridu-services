import { AddUserForm } from "@/admin/users/components/add-user-form";
import { Button } from "@eridu/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@eridu/ui/components/dialog";
import { cn } from "@eridu/ui/lib/utils";
import { Plus } from "lucide-react";

type AddUserModalProps = {} & React.ComponentProps<"button">;

export const AddUserModal: React.FC<AddUserModalProps> = ({ className, ...props }) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="default"
          className={cn("w-full sm:w-min", className)}
          {...props}
        >
          <Plus />
          <span>Add User</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add new user</DialogTitle>
          <DialogDescription>
            Fill in the details to create a user
          </DialogDescription>
        </DialogHeader>
        <AddUserForm />
      </DialogContent>
    </Dialog>
  );
};
