import { AddUserForm } from "@/admin/users/components/forms/add-user-form";
import { UserSearchFilters } from "@/admin/users/components/user-search-filters";
import { useAdminUserColumns } from "@/admin/users/hooks/use-admin-user-columns";
import { useQueryUsers } from "@/admin/users/hooks/use-query-users";
import { FullPage } from "@/components/hoc/full-page";
import { Modal } from "@/components/modal";
import { Pagination } from "@/components/pagination";
import { Button } from "@eridu/ui/components/button";
import DataTable from "@eridu/ui/components/data-table";
import { LoaderCircle, Plus } from "lucide-react";

// TODO: allow users to change the limit
const LIMIT = 10;

const UsersPageContent: React.FC = () => {
  const { data, isPending, isError, error } = useQueryUsers();
  const columns = useAdminUserColumns();

  if (isPending) {
    return (
      <div className="flex-1 flex justify-center items-center">
        <div>
          <LoaderCircle className="animate-spin" />
        </div>
      </div>
    );
  }

  if (isError) {
    return <p className="text-center">{error?.message || "something went wrong"}</p>;
  }

  if (!data) {
    return <p className="text-center">No data</p>;
  }

  const page = "offset" in data && data.offset !== undefined && data.limit !== undefined
    ? Math.ceil(data.offset / data.limit) + 1
    : 1;

  return (
    <>
      <div className="max-w-full overflow-auto h-full max-h-sm-user-content-area sm:max-h-user-content-area">
        <DataTable columns={columns} data={data.users} />
      </div>
      <div className="p-4">
        <Pagination pageSize={LIMIT} page={page} total={data?.total ?? 1} />
      </div>
    </>
  );
};

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
      <UsersPageContent />
    </div>
  );
};

export const UsersFullPage = FullPage(UsersPage);

export default UsersFullPage;
