import { FullPage } from "@/components/hoc/full-page";
import { PaginatedDataTable } from "@/components/paginated-data-table";
import { AddUserModal } from "@/erify/admin/users/components/add-user-modal";
import { Dialogs } from "@/erify/admin/users/components/dialogs";
import { UserSearchFilters } from "@/erify/admin/users/components/user-search-filters";
import { useAdminUserColumns } from "@/erify/admin/users/hooks/use-admin-user-columns";
import { useQueryUsers } from "@/erify/admin/users/hooks/use-query-users";

const Users: React.FC = () => {
  const { data, error, isPending, isError } = useQueryUsers();
  const columns = useAdminUserColumns();

  return (
    <div className="h-full p-4 pb-0 flex flex-col">
      <div className="max-w-full flex flex-col sm:flex-row gap-4 mb-4 sm:mb-0">
        <UserSearchFilters className="w-full order-2 sm:order-1" />
        <AddUserModal />
      </div>
      <PaginatedDataTable
        columns={columns}
        data={data}
        error={error}
        isLoading={isPending}
        isError={isError}
      />
      <Dialogs />
    </div>
  );
};

export const UsersPage = FullPage(Users);

export default UsersPage;
