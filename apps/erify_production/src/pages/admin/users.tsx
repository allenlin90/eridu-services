import { AddUserForm } from "@/admin/users/components/forms/add-user-form";
import { UserSearchFilters } from "@/admin/users/components/user-search-filters";
import { UsersTable } from "@/admin/users/components/users-table";
import { FullPage } from "@/components/hoc/full-page";
import { Modal } from "@/components/modal";
import { Button } from "@eridu/ui/components/button";
import { Plus } from "lucide-react";

const UsersPage: React.FC = () => {
  return (
    <div className="h-full p-4 pb-0 flex flex-col">
      <div className="max-w-full flex flex-col sm:flex-row gap-4 mb-4 sm:mb-0">
        <UserSearchFilters className="w-full order-2 sm:order-1" />
        <Modal
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
          <AddUserForm />
        </Modal>
      </div>
      <UsersTable />
    </div>
  );
};

export const UsersFullPage = FullPage(UsersPage);

export default UsersFullPage;
