import { UserSearchFilters } from "@/admin/users/components/user-search-filters";
import { useAdminUserColumns } from "@/admin/users/hooks/use-admin-user-columns";
import { useUsers } from "@/admin/users/hooks/use-users";
import FullPage from "@/components/hoc/full-page";
import { Pagination } from "@/components/pagination";
import DataTable from "@eridu/ui/components/data-table";
import { LoaderCircle } from "lucide-react";

// TODO: allow users to change the limit
const LIMIT = 10;

const Users: React.FC = () => {
  const { isPending, data, isError, error } = useUsers();
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
    return <p>{error.message}</p>;
  }

  const page = Math.ceil(data.offset / data.limit) + 1;

  return (
    <>
      <div className="p-4 min-w-xs">
        <UserSearchFilters />
      </div>
      <div className="max-w-full p-4 overflow-auto h-full max-h-user-content-area">
        <DataTable columns={columns} data={data.data} />
      </div>
      <div className="min-w-full max-w-full p-4">
        <Pagination pageSize={LIMIT} page={page} total={data.total} />
      </div>
    </>
  );
};

export const UsersFullPage = FullPage(Users);

export default UsersFullPage;
